#!/usr/bin/env python3
"""RunFlow release plumbing. Credentials are read only by the signing command."""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import xml.etree.ElementTree as ET

EPOCH = 1_000_000
MAX_CODE = 2_100_000_000
PACKAGE = 'com.runflow2.app'


def run(*args, **kwargs):
    return subprocess.check_output(args, text=True, **kwargs).strip()


def api(path, method='GET', body=None):
    command = ['gh', 'api', path, '--method', method]
    if body is not None:
        command += ['--input', '-']
    result = subprocess.run(command, input=json.dumps(body) if body is not None else None,
                            capture_output=True, text=True)
    if result.returncode:
        if 'HTTP 404' in result.stderr:
            return None
        raise RuntimeError(f'GitHub API failed for {method} {path}: {result.stderr}')
    return json.loads(result.stdout) if result.stdout.strip() else None


def allocate(source, ref, count, sha):
    name = re.search(r'^\s*versionName = "(\d+\.\d+\.\d+)"$', source, re.M)
    code = re.search(r'^\s*versionCode = (\d+)$', source, re.M)
    if not name or not code or count < 1 or not re.fullmatch(r'[0-9a-f]{40}', sha):
        raise ValueError('Invalid committed version or git history')
    stable = ref.startswith('refs/tags/')
    if stable and ref != f'refs/tags/v{name[1]}':
        raise ValueError('Stable tag must exactly match committed versionName')
    if not stable and ref != 'refs/heads/master':
        raise ValueError('Release builds require master or a matching version tag')
    value = EPOCH + count * 2 + int(stable)
    if not 0 < value < MAX_CODE:
        raise ValueError('versionCode exceeds Android limit')
    if stable and int(code[1]) != value:
        raise ValueError(f'Committed stable versionCode must be {value}')
    return {'version_name': name[1] if stable else f'{name[1]}-beta.{sha[:12]}',
            'version_code': value, 'channel': 'stable' if stable else 'development',
            'tag': f'v{name[1]}' if stable else 'development', 'sha': sha}


def prepare():
    sha = run('git', 'rev-parse', 'HEAD')
    if sha != os.environ['GITHUB_SHA']:
        raise ValueError('Checkout differs from trigger SHA')
    run('git', 'fetch', 'origin', 'master')
    run('git', 'merge-base', '--is-ancestor', sha, 'origin/master')
    data = allocate(Path('android/app/build.gradle.kts').read_text(), os.environ['GITHUB_REF'],
                    int(run('git', 'rev-list', '--count', sha)), sha)
    if data['channel'] == 'stable':
        notes = Path('docs/releases') / f'{data["version_name"]}.md'
        if not notes.is_file() or not notes.read_text().strip():
            raise ValueError(f'Missing stable release notes: {notes}')
    event = os.environ['GITHUB_EVENT_NAME']
    if event not in ('push', 'workflow_dispatch'):
        raise ValueError('Untrusted release event')
    data['publish'] = event == 'push' or os.environ.get('MANUAL_PUBLISH') == 'true'
    Path('release-plan.json').write_text(json.dumps(data, indent=2))
    with open(os.environ['GITHUB_ENV'], 'a') as f:
        f.write(f'ANDROID_VERSION_CODE={data["version_code"]}\nANDROID_VERSION_NAME={data["version_name"]}\n')
    with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
        f.write(f'publish={str(data["publish"]).lower()}\nversion_name={data["version_name"]}\n')
    print(f'{data["channel"]}: {data["version_name"]} ({data["version_code"]}) at {sha}')


def configure_signing():
    keys = ['KEYSTORE_BASE64', 'STORE_PASSWORD', 'KEY_ALIAS', 'KEY_PASSWORD']
    if any(not os.environ.get(key) for key in keys):
        raise ValueError('All four release signing secrets are required')
    fingerprint = os.environ.get('EXPECTED_CERT_SHA256', '')
    if not re.fullmatch('[0-9a-f]{64}', fingerprint):
        raise ValueError('RELEASE_CERT_SHA256 must pin the existing public signing certificate')
    store = Path(os.environ['RUNNER_TEMP']) / 'runflow-release.keystore'
    store.write_bytes(base64.b64decode(os.environ['KEYSTORE_BASE64'], validate=True))
    store.chmod(0o600)
    cert = subprocess.check_output(['keytool', '-exportcert', '-keystore', str(store),
                                   '-storepass:env', 'STORE_PASSWORD', '-alias', os.environ['KEY_ALIAS']])
    if hashlib.sha256(cert).hexdigest() != fingerprint:
        raise ValueError('Configured keystore differs from trusted published certificate')
    def escape(value):
        return value.replace('\\', '\\\\').replace('\n', '\\n').replace('\r', '\\r')
    properties = {'storeFile': str(store), 'storePassword': os.environ['STORE_PASSWORD'],
                  'keyAlias': os.environ['KEY_ALIAS'], 'keyPassword': os.environ['KEY_PASSWORD']}
    config = Path('android/key.properties')
    config.write_text(''.join(f'{k}={escape(v)}\n' for k, v in properties.items()))
    config.chmod(0o600)


def unique_certificate(output):
    values = set(re.findall(r'certificate SHA-256 digest: ([0-9a-fA-F]+)', output))
    if len(values) != 1:
        raise ValueError('APK must contain exactly one signing identity')
    return values.pop().lower()


def verify_identity(apk, aab, data):
    expected = os.environ['EXPECTED_CERT_SHA256']
    sdk = Path(os.environ['ANDROID_HOME']) / 'build-tools'
    tools = max((p for p in sdk.iterdir() if (p / 'apksigner').exists()),
                key=lambda p: tuple(int(x) for x in p.name.split('.') if x.isdigit()))
    if unique_certificate(run(str(tools / 'apksigner'), 'verify', '--print-certs', str(apk))) != expected:
        raise ValueError('APK certificate mismatch')
    package_line = run(str(tools / 'aapt'), 'dump', 'badging', str(apk)).splitlines()[0]
    for token in [f"name='{PACKAGE}'", f"versionCode='{data['version_code']}'", f"versionName='{data['version_name']}'"]:
        if token not in package_line:
            raise ValueError(f'APK metadata mismatch: {token}')
    if 'jar verified.' not in run('jarsigner', '-verify', str(aab)):
        raise ValueError('AAB signature did not verify')
    certificate = run('keytool', '-printcert', '-jarfile', str(aab))
    digests = re.findall(r'SHA256:\s*([0-9A-Fa-f:]+)', certificate)
    if len(digests) != 1 or digests[0].replace(':', '').lower() != expected:
        raise ValueError('AAB certificate mismatch')
    manifest = run('java', '-jar', os.environ['BUNDLETOOL_JAR'], 'dump', 'manifest', '--bundle='+str(aab), '--module=base')
    root = ET.fromstring(manifest);android = '{http://schemas.android.com/apk/res/android}'
    if (root.attrib.get('package'), root.attrib.get(android+'versionCode'), root.attrib.get(android+'versionName')) != (PACKAGE, str(data['version_code']), data['version_name']):
        raise ValueError('AAB package/version metadata mismatch')


def verify():
    data = json.loads(Path('release-plan.json').read_text())
    out = Path('release-assets');out.mkdir(exist_ok=True)
    apks = list(Path('android/app/build/outputs/apk/release').glob('*.apk'))
    aabs = list(Path('android/app/build/outputs/bundle/release').glob('*.aab'))
    if len(apks) != 1 or len(aabs) != 1:
        raise ValueError('Expected exactly one APK and one AAB')
    apk, aab = apks[0], aabs[0]
    verify_identity(apk, aab, data)
    import shutil
    build = '' if data['channel'] == 'stable' else f'-run{os.environ["GITHUB_RUN_ID"]}.{os.environ["GITHUB_RUN_ATTEMPT"]}'
    stem = f'{data["version_name"]}-{data["sha"]}{build}'
    for artifact in (apk, aab):
        shutil.copyfile(artifact, out / f'RunFlow-{stem}{artifact.suffix}')
    metadata = out / f'release-{stem}.json'
    metadata.write_text(json.dumps(data, indent=2)+'\n')
    checksum = out / (f'SHA256SUMS-{stem}.txt' if data['channel'] == 'development' else 'SHA256SUMS')
    checksum.write_text(''.join(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.name}\n' for p in sorted(out.iterdir()) if p != checksum))

def download_asset(repo, asset):
    result = subprocess.run(['gh', 'api', f'repos/{repo}/releases/assets/{asset["id"]}', '-H', 'Accept: application/octet-stream'], capture_output=True)
    if result.returncode:
        raise ValueError(f'Cannot download published asset: {asset["name"]}')
    return result.stdout


def verify_remote(release, assets):
    expected = {p.name: p for p in assets}
    actual = {a['name']: a for a in release['assets']}
    if not expected.keys() <= actual.keys():
        raise ValueError('Published asset inventory incomplete')
    for name, local in expected.items():
        if hashlib.sha256(download_asset(os.environ['GITHUB_REPOSITORY'], actual[name])).digest() != hashlib.sha256(local.read_bytes()).digest():
            raise ValueError(f'Published download differs: {name}')


def verify_published_stable(release, data):
    # Verify the original published bytes, not a potentially nondeterministic rebuild.
    with tempfile.TemporaryDirectory() as folder:
        root = Path(folder)
        for asset in release['assets']:
            name = asset['name']
            if Path(name).name != name:
                raise ValueError('Unsafe published asset filename')
            (root/name).write_bytes(download_asset(os.environ['GITHUB_REPOSITORY'], asset))
        entries = {}
        for line in (root/'SHA256SUMS').read_text().splitlines():
            match = re.fullmatch(r'([0-9a-f]{64})  ([^/\\]+)', line)
            if not match or match[2] in entries or match[2] in ('.', '..', 'SHA256SUMS'):
                raise ValueError('Invalid published checksum manifest')
            entries[match[2]] = match[1]
        if set(entries) | {'SHA256SUMS'} != {p.name for p in root.iterdir()}:
            raise ValueError('Published checksum inventory differs')
        for name, digest in entries.items():
            if hashlib.sha256((root/name).read_bytes()).hexdigest() != digest:
                raise ValueError('Published checksum mismatch')
        metadata = list(root.glob('release-*.json'))
        if len(metadata) != 1:
            raise ValueError('Published provenance metadata missing')
        original = json.loads(metadata[0].read_text())
        if any(original.get(k) != data[k] for k in ('sha', 'version_name', 'version_code', 'tag', 'channel')):
            raise ValueError('Published provenance metadata differs')
        apks, aabs = list(root.glob('*.apk')), list(root.glob('*.aab'))
        if len(apks) != 1 or len(aabs) != 1:
            raise ValueError('Published artifact set differs')
        verify_identity(apks[0], aabs[0], data)


def publish():
    data = json.loads(Path('release-plan.json').read_text())
    if not data['publish']:
        raise ValueError('This run was not authorized to publish')
    repo = os.environ['GITHUB_REPOSITORY'];base = f'repos/{repo}'
    stable = data['channel'] == 'stable'
    if stable:
        remote_tag = api(base+'/commits/'+data['tag'])
        if remote_tag is None or remote_tag.get('sha') != data['sha']:
            raise ValueError('Stable tag no longer points to the verified source; refusing publication')
    if not stable and api(base+'/branches/master')['commit']['sha'] != data['sha']:
        print('Skipping stale development commit');return
    # Paginate all releases, including drafts: tag lookup can omit unpublished drafts.
    releases = json.loads(run('gh', 'api', '--paginate', '--slurp', base+'/releases?per_page=100'))
    releases = [release for page in releases for release in page]
    matches = [release for release in releases if release['tag_name'] == data['tag']]
    if len(matches) > 1:
        raise ValueError('Ambiguous release drafts for tag')
    release = matches[0] if matches else None
    if not stable and release and not release['draft'] and not release['prerelease']:
        raise ValueError('Refusing to convert a stable release into development')
    assets = sorted(Path('release-assets').iterdir())
    names = {p.name for p in assets}
    body = (Path(f'docs/releases/{data["version_name"]}.md').read_text() if stable else
            'Automatic development build from the latest verified master commit.\n\n'
            'This prerelease reuses its release ID; its development tag moves after verified uploads.\n')
    title = (body.splitlines()[0].lstrip('# ').strip() if stable else 'Development build — automatic')
    body += f'\n\nVersion: `{data["version_name"]}`\nVersion code: `{data["version_code"]}`\nCommit: `{data["sha"]}`\n'
    if stable and release and not release['draft']:
        if api(base+'/commits/'+data['tag'])['sha'] != data['sha'] or data['sha'] not in release['body'] or {a['name'] for a in release['assets']} != names:
            raise ValueError('Existing stable release provenance/inventory mismatch')
        if release['prerelease']:
            raise ValueError('Stable release is incorrectly marked prerelease')
        verify_published_stable(release, data)
        latest = api(base+'/releases/latest')
        if latest is None or latest['id'] != release['id']:
            raise ValueError('Stable rerun is not GitHub Latest; do not silently change historical releases')
        print('Published stable release verified; no assets replaced');return
    if stable:
        for previous in releases:
            if previous['draft'] or previous['prerelease'] or previous['tag_name'] == data['tag']:
                continue
            match = re.search(r'Version code: `(\d+)`', previous.get('body') or '')
            if match and int(match[1]) >= data['version_code']:
                raise ValueError('Stable code must exceed previously published stable codes')
    if release is None:
        release = api(base+'/releases', 'POST', {'tag_name': data['tag'], 'target_commitish': data['sha'],
                                               'name': title,
                                               'body': body, 'draft': True, 'prerelease': not stable})
    release_id = release['id']
    # Upload by retained ID, including private draft assets. Existing build-specific
    # names are replaced only on unpublished drafts; rolling builds have unique names.
    import urllib.parse
    for asset in assets:
        existing = next((a for a in release['assets'] if a['name'] == asset.name), None)
        if existing:
            if release['draft']:
                api(base+f'/releases/assets/{existing["id"]}', 'DELETE')
            else:
                verify_remote(release, [asset])
                continue
        endpoint = f'https://uploads.github.com/repos/{repo}/releases/{release_id}/assets?name='+urllib.parse.quote(asset.name)
        subprocess.run(['gh', 'api', endpoint, '--method', 'POST', '-H', 'Content-Type: application/octet-stream', '--input', str(asset)], check=True, stdout=subprocess.DEVNULL)
    release = api(base+f'/releases/{release_id}')
    verify_remote(release, assets)
    if stable and {a['name'] for a in release['assets']} != names:
        raise ValueError('Stable draft contains unexpected assets; review before publication')
    if not stable:
        for old in release['assets']:
            if old['name'] not in names:
                api(base+f'/releases/assets/{old["id"]}', 'DELETE')
    api(base+f'/releases/{release_id}', 'PATCH', {'draft': False, 'prerelease': not stable,
                                               'make_latest': 'true' if stable else 'false', 'body': body,
                                               'name': title})
    if not stable:
        tag = api(base+'/git/ref/tags/development')
        if tag is None:
            api(base+'/git/refs', 'POST', {'ref': 'refs/tags/development', 'sha': data['sha']})
        else:
            api(base+'/git/refs/tags/development', 'PATCH', {'sha': data['sha'], 'force': True})
    final = api(base+f'/releases/{release_id}')
    if {a['name'] for a in final['assets']} != names:
        raise ValueError('Final release asset inventory differs')
    verify_remote(final, assets)
    if final['draft'] or final['prerelease'] != (not stable):
        raise ValueError('Published release flags differ')
    if api(base+'/commits/'+data['tag'])['sha'] != data['sha']:
        raise ValueError('Published source tag differs')
    if stable and api(base+'/releases/latest')['id'] != release_id:
        raise ValueError('Stable release is not GitHub Latest')
    print(final['html_url'])


if __name__ == '__main__':
    parser = argparse.ArgumentParser();parser.add_argument('command', choices=['prepare', 'signing', 'verify', 'publish'])
    args = parser.parse_args()
    {'prepare': prepare, 'signing': configure_signing, 'verify': verify, 'publish': publish}[args.command]()
