'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, AlertTriangle } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onScan: (_barcode: string) => void;
    preAuthorizedStream?: MediaStream | null;
    embedded?: boolean;
}

export function BarcodeScannerModal({ isOpen, onClose, onScan, preAuthorizedStream, embedded = false }: Props) {
    const [error, setError] = useState<string | null>(null);
    const webScannerRef = useRef<Html5Qrcode | null>(null);
    const scanHandledRef = useRef(false);

    const stopWebScanner = useCallback(() => {
        if (webScannerRef.current) {
            try {
                webScannerRef.current.stop().then(() => {
                    webScannerRef.current?.clear();
                    webScannerRef.current = null;
                }).catch(() => {
                    try { webScannerRef.current?.clear(); } catch { /* ignore */ }
                    webScannerRef.current = null;
                });
            } catch (err) {
                console.error("Scanner stop error", err);
                webScannerRef.current = null;
            }
        }
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        setError(null);
        scanHandledRef.current = false;

        const startWebScanner = async () => {
            let html5QrCode: Html5Qrcode | null = null;
            try {
                // Stop the pre-authorized stream tracks — Html5Qrcode manages its own stream,
                // but permission is already granted from the click handler
                if (preAuthorizedStream) {
                    preAuthorizedStream.getTracks().forEach(track => track.stop());
                }

                html5QrCode = new Html5Qrcode("web-reader");
                webScannerRef.current = html5QrCode;

                const config = { fps: 10, qrbox: { width: 250, height: 250 } };

                const onSuccess = (decodedText: string) => {
                    if (scanHandledRef.current) return;
                    scanHandledRef.current = true;
                    stopWebScanner();
                    onScan(decodedText);
                };

                try {
                    await html5QrCode.start(
                        { facingMode: "environment" },
                        config,
                        onSuccess,
                        () => { /* ignore stream noise */ }
                    );
                } catch {
                    // Fallback: try to get camera list and use first one
                    const cameras = await Html5Qrcode.getCameras();
                    if (cameras && cameras.length > 0) {
                        await html5QrCode.start(
                            cameras[0].id,
                            config,
                            onSuccess,
                            () => { /* ignore */ }
                        );
                    } else {
                        setError('No cameras found on this device.');
                    }
                }
            } catch (err: any) {
                console.error("Error starting web scanner:", err);
                if (err?.message?.includes('Permission') || err?.name === 'NotAllowedError') {
                    setError('Camera permission was denied. Please allow camera access in your browser settings.');
                } else {
                    setError('Could not start camera. Make sure the site is served over HTTPS and camera access is allowed.');
                }
            }
        };

        // Start immediately — permission was already granted in the click handler
        startWebScanner();

        return () => {
            stopWebScanner();
        };
    }, [isOpen, onScan, stopWebScanner, preAuthorizedStream]);

    if (!isOpen) return null;

    if (embedded) {
        return (
            <div className="flex flex-col items-center justify-center p-4 gap-4 min-h-[260px]">
                {error ? (
                    <div className="flex flex-col items-center gap-3 p-4 max-w-xs text-center">
                        <AlertTriangle className="w-10 h-10 text-workout-tempo" />
                        <p className="text-foreground text-sm">{error}</p>
                    </div>
                ) : (
                    <div id="web-reader" className="w-full max-w-sm bg-white rounded-md overflow-hidden" />
                )}
                {!error && (
                    <p className="text-xs text-foreground-muted text-center">
                        Position the barcode inside the frame. It will scan automatically.
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex flex-col pb-safe barcode-scanner-modal bg-black/90">
            <div className="flex justify-between items-center p-4 pt-12 relative z-10">
                <h2 className="text-white font-semibold text-lg">Scan Barcode</h2>
                <button onClick={onClose} className="p-2 bg-white/10 rounded-full">
                    <X className="w-6 h-6 text-white" />
                </button>
            </div>

            <div className="flex-1 relative flex items-center justify-center">
                {error ? (
                    <div className="flex flex-col items-center gap-4 p-6 max-w-xs text-center">
                        <AlertTriangle className="w-12 h-12 text-workout-tempo" />
                        <p className="text-foreground text-sm">{error}</p>
                        <button
                            onClick={onClose}
                            className="mt-2 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm transition-colors"
                        >
                            Close
                        </button>
                    </div>
                ) : (
                    <div id="web-reader" className="w-full max-w-sm bg-white rounded-lg overflow-hidden"></div>
                )}
            </div>

            {!error && (
                <div className="p-8 text-center text-foreground-muted">
                    Position the barcode inside the frame. It will scan automatically.
                </div>
            )}
        </div>
    );
}
