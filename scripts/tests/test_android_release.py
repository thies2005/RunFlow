import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('android_release', Path(__file__).parents[1] / 'android_release.py')
module = importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
SHA = 'a' * 40


def source(code=1000021):
    return f'        versionCode = {code}\n        versionName = "2.8.4"\n'


class ReleaseRules(unittest.TestCase):
    def test_channel_ordering(self):
        dev = module.allocate(source(), 'refs/heads/master', 10, SHA)
        stable = module.allocate(source(), 'refs/tags/v2.8.4', 10, SHA)
        following = module.allocate(source(), 'refs/heads/master', 11, SHA)
        self.assertLess(dev['version_code'], stable['version_code'])
        self.assertLess(stable['version_code'], following['version_code'])
        self.assertEqual(dev['version_name'], '2.8.4-beta.' + SHA[:12])

    def test_mismatched_and_nonsemver_tags(self):
        for ref in ['refs/tags/v2.8.5', 'refs/tags/v2.8.4-beta', 'refs/tags/v02.8.4']:
            with self.subTest(ref=ref), self.assertRaises(ValueError):
                module.allocate(source(), ref, 10, SHA)

    def test_untrusted_branch(self):
        with self.assertRaises(ValueError):
            module.allocate(source(), 'refs/heads/feature', 10, SHA)

    def test_stale_literal_version(self):
        with self.assertRaises(ValueError):
            module.allocate(source(24), 'refs/tags/v2.8.4', 10, SHA)

    def test_missing_history_and_overflow(self):
        for count in [0, 2_000_000_000]:
            with self.subTest(count=count), self.assertRaises(ValueError):
                module.allocate(source(), 'refs/heads/master', count, SHA)

    def test_certificate_prefix_variations(self):
        cert = 'b' * 64
        for prefix in ['Signer #1', 'V2 Signer:']:
            self.assertEqual(module.unique_certificate(f'{prefix} certificate SHA-256 digest: {cert}'), cert)
        for value in ['', 'certificate SHA-256 digest: aa\ncertificate SHA-256 digest: bb']:
            with self.assertRaises(ValueError):
                module.unique_certificate(value)




class PublicationRecovery(unittest.TestCase):
    def setUp(self):
        import tempfile
        import os
        from unittest.mock import patch
        self.temp = tempfile.TemporaryDirectory()
        self.cwd = os.getcwd();os.chdir(self.temp.name)
        self.environment = patch.dict(os.environ, {'GITHUB_REPOSITORY': 'owner/repo'}, clear=False)
        self.environment.start()
        self.events = []
        Path('release-assets').mkdir()
        (Path('release-assets')/'new.apk').write_bytes(b'APK')

    def tearDown(self):
        import os
        self.environment.stop();os.chdir(self.cwd);self.temp.cleanup()

    def setup_release(self, stable=False):
        import json
        data = {'sha': SHA, 'version_name': '2.8.4', 'version_code': 1000021,
                'channel': 'stable' if stable else 'development',
                'tag': 'v2.8.4' if stable else 'development', 'publish': True}
        Path('release-plan.json').write_text(json.dumps(data))
        if stable:
            Path('docs/releases').mkdir(parents=True)
            Path('docs/releases/2.8.4.md').write_text('Release notes')
        self.release = {'id': 42, 'tag_name': data['tag'], 'body': '',
                        'draft': stable, 'prerelease': not stable, 'html_url': 'https://example/release',
                        'assets': [] if stable else [{'id': 7, 'name': 'old.apk'}]}
        return data

    def fake_api(self, path, method='GET', body=None):
        self.events.append((method, path))
        if path.endswith('/branches/master'):
            return {'commit': {'sha': SHA}}
        if '/commits/' in path:
            return {'sha': SHA}
        if path.endswith('/releases/latest'):
            return self.release
        if path.endswith('/releases/42'):
            if method == 'PATCH':
                self.release.update(body)
            return self.release
        if '/releases/assets/' in path and method == 'DELETE':
            asset_id = int(path.rsplit('/', 1)[1])
            self.release['assets'] = [a for a in self.release['assets'] if a['id'] != asset_id]
            return None
        if path.endswith('/git/ref/tags/development'):
            return {'object': {'sha': 'b'*40}}
        if '/git/refs/' in path:
            return {}
        raise AssertionError((path, method, body))

    def fake_upload(self, *args, **kwargs):
        self.events.append(('UPLOAD', 'new.apk'))
        self.release['assets'].append({'id': 8, 'name': 'new.apk'})

    def fake_verify(self, *args):
        self.events.append(('VERIFY', 'assets'))

    def test_rolling_upload_verify_cleanup_tag_last(self):
        import json
        from unittest.mock import patch
        self.setup_release()
        with patch.object(module, 'api', side_effect=self.fake_api), \
             patch.object(module, 'run', return_value=json.dumps([[self.release]])), \
             patch.object(module.subprocess, 'run', side_effect=self.fake_upload), \
             patch.object(module, 'verify_remote', side_effect=self.fake_verify):
            module.publish()
        upload = self.events.index(('UPLOAD', 'new.apk'))
        verify = self.events.index(('VERIFY', 'assets'))
        cleanup = self.events.index(('DELETE', 'repos/owner/repo/releases/assets/7'))
        tag = self.events.index(('PATCH', 'repos/owner/repo/git/refs/tags/development'))
        mutations = [(method, path) for method, path in self.events if method in ('PATCH', 'POST', 'DELETE')]
        self.assertLess(upload, verify);self.assertLess(verify, cleanup);self.assertLess(cleanup, tag)
        self.assertEqual(mutations[-1], ('PATCH', 'repos/owner/repo/git/refs/tags/development'))
        self.assertEqual(self.release['id'], 42)

    def test_failed_replacement_keeps_old_assets_and_tag(self):
        import json
        from unittest.mock import patch
        self.setup_release()
        with patch.object(module, 'api', side_effect=self.fake_api), \
             patch.object(module, 'run', return_value=json.dumps([[self.release]])), \
             patch.object(module.subprocess, 'run', side_effect=self.fake_upload), \
             patch.object(module, 'verify_remote', side_effect=ValueError('corrupt download')):
            with self.assertRaises(ValueError):
                module.publish()
        self.assertIn('old.apk', [a['name'] for a in self.release['assets']])
        self.assertFalse(any(method in ('DELETE', 'PATCH') for method, _ in self.events))

    def test_stable_reuses_draft_id(self):
        import json
        from unittest.mock import patch
        self.setup_release(stable=True)
        with patch.object(module, 'api', side_effect=self.fake_api), \
             patch.object(module, 'run', return_value=json.dumps([[self.release]])), \
             patch.object(module.subprocess, 'run', side_effect=self.fake_upload), \
             patch.object(module, 'verify_remote', side_effect=self.fake_verify):
            module.publish()
        self.assertFalse(self.release['draft'])
        self.assertNotIn(('POST', 'repos/owner/repo/releases'), self.events)
        self.assertEqual(self.release['id'], 42)

    def test_moved_stable_tag_never_uploads_or_mutates(self):
        from unittest.mock import patch
        self.setup_release(stable=True)
        with patch.object(module, 'api', return_value={'sha': 'b'*40}) as request, \
             patch.object(module, 'run') as list_releases, \
             patch.object(module.subprocess, 'run') as upload:
            with self.assertRaisesRegex(ValueError, 'Stable tag no longer points'):
                module.publish()
        upload.assert_not_called()
        list_releases.assert_not_called()
        request.assert_called_once_with('repos/owner/repo/commits/v2.8.4')

    def test_stale_master_never_uploads_or_mutates(self):
        from unittest.mock import patch
        self.setup_release()
        with patch.object(module, 'api', return_value={'commit': {'sha': 'b'*40}}) as request, \
             patch.object(module.subprocess, 'run') as upload:
            module.publish()
        upload.assert_not_called()
        self.assertEqual(request.call_count, 1)

    def test_original_stable_manifest_verified_without_rebuilt_byte_comparison(self):
        import hashlib
        import json
        from unittest.mock import patch
        data = self.setup_release(stable=True)
        payloads = {'original.apk': b'old timestamp APK', 'original.aab': b'old timestamp AAB',
                    'release-original.json': json.dumps(data).encode()}
        payloads['SHA256SUMS'] = ''.join(f'{hashlib.sha256(value).hexdigest()}  {name}\n' for name, value in payloads.items()).encode()
        release = {'assets': [{'name': name, 'id': i} for i, name in enumerate(payloads)]}
        with patch.object(module, 'download_asset', side_effect=lambda repo, asset: payloads[asset['name']]), \
             patch.object(module, 'verify_identity') as verify:
            module.verify_published_stable(release, data)
        verify.assert_called_once()
        payloads['original.apk'] = b'corrupt'
        with patch.object(module, 'download_asset', side_effect=lambda repo, asset: payloads[asset['name']]), \
             patch.object(module, 'verify_identity') as verify:
            with self.assertRaises(ValueError):
                module.verify_published_stable(release, data)
        verify.assert_not_called()

    def test_unpublished_draft_replaces_same_name_after_interruption(self):
        import json
        from unittest.mock import patch
        self.setup_release(stable=True)
        self.release['assets'] = [{'id': 7, 'name': 'new.apk'}]
        with patch.object(module, 'api', side_effect=self.fake_api), \
             patch.object(module, 'run', return_value=json.dumps([[self.release]])), \
             patch.object(module.subprocess, 'run', side_effect=self.fake_upload), \
             patch.object(module, 'verify_remote', side_effect=self.fake_verify):
            module.publish()
        self.assertIn(('DELETE', 'repos/owner/repo/releases/assets/7'), self.events)
        self.assertEqual(self.release['id'], 42)


if __name__ == '__main__':
    unittest.main()
