'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Html5Qrcode } from 'html5-qrcode';
import { X, AlertTriangle } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onScan: (_barcode: string) => void;
}

// Evaluate synchronously so the very first render knows which path to take
const IS_NATIVE = Capacitor.isNativePlatform();

export function BarcodeScannerModal({ isOpen, onClose, onScan }: Props) {
    const [error, setError] = useState<string | null>(null);
    const webScannerRef = useRef<Html5Qrcode | null>(null);
    const scanHandledRef = useRef(false);

    const stopNativeScanner = useCallback(async () => {
        document.body.classList.remove('barcode-scanner-active');
        document.body.style.background = '';
        document.documentElement.style.background = '';
        try {
            await BarcodeScanner.stopScan();
            await BarcodeScanner.removeAllListeners();
        } catch { /* already stopped */ }
    }, []);

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

        if (IS_NATIVE) {
            // ─── NATIVE CAPACITOR LOGIC ───
            const startNativeScanner = async () => {
                try {
                    const { camera } = await BarcodeScanner.requestPermissions();
                    if (camera === 'granted' || camera === 'limited') {
                        document.body.classList.add('barcode-scanner-active');
                        document.body.style.background = 'transparent';
                        document.documentElement.style.background = 'transparent';

                        await BarcodeScanner.startScan();
                        BarcodeScanner.addListener('barcodesScanned', async (event: any) => {
                            if (scanHandledRef.current) return;
                            if (event.barcodes && event.barcodes.length > 0) {
                                scanHandledRef.current = true;
                                await stopNativeScanner();
                                onScan(event.barcodes[0].rawValue);
                            }
                        });
                    } else {
                        setError('Camera permission was denied. Please allow camera access in your device settings.');
                    }
                } catch (err) {
                    console.error("Error starting native scanner:", err);
                    setError('Could not start camera. Please check permissions in your device settings.');
                }
            };
            startNativeScanner();
        } else {
            // ─── WEB / PWA LOGIC ───
            const startWebScanner = async () => {
                let html5QrCode: Html5Qrcode | null = null;
                try {
                    const cameras = await Html5Qrcode.getCameras();
                    if (!cameras || cameras.length === 0) {
                        setError('No cameras found on this device.');
                        return;
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
                        await html5QrCode.start(
                            cameras[0].id,
                            config,
                            onSuccess,
                            () => { /* ignore */ }
                        );
                    }
                } catch (err: any) {
                    console.error("Error starting web scanner:", err);
                    if (err?.message?.includes('Permission')) {
                        setError('Camera permission was denied. Please allow camera access in your browser settings.');
                    } else {
                        setError('Could not start camera. Make sure the site is served over HTTPS and camera access is allowed.');
                    }
                }
            };

            // Small delay to allow modal div to fully render
            setTimeout(startWebScanner, 300);
        }

        return () => {
            if (IS_NATIVE) {
                stopNativeScanner();
            } else {
                stopWebScanner();
            }
        };
    }, [isOpen, onScan, stopNativeScanner, stopWebScanner]);

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-[100] flex flex-col pb-safe barcode-scanner-modal ${IS_NATIVE ? 'bg-transparent' : 'bg-black/90'}`}>
            {IS_NATIVE && (
                <div className="absolute inset-0 bg-black/60 z-0 select-none pointer-events-none" />
            )}

            <div className="flex justify-between items-center p-4 pt-12 relative z-10">
                <h2 className="text-white font-bold text-lg">Scan Barcode</h2>
                <button onClick={onClose} className="p-2 bg-white/10 rounded-full">
                    <X className="w-6 h-6 text-white" />
                </button>
            </div>

            <div className="flex-1 relative flex items-center justify-center">
                {error ? (
                    <div className="flex flex-col items-center gap-4 p-6 max-w-xs text-center">
                        <AlertTriangle className="w-12 h-12 text-yellow-400" />
                        <p className="text-white text-sm">{error}</p>
                        <button
                            onClick={onClose}
                            className="mt-2 px-6 py-2 bg-white/15 hover:bg-white/25 text-white rounded-full text-sm transition-colors"
                        >
                            Close
                        </button>
                    </div>
                ) : IS_NATIVE ? (
                    <div className="w-64 h-64 border-2 border-green-500 bg-transparent rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
                ) : (
                    <div id="web-reader" className="w-full max-w-sm bg-white rounded-lg overflow-hidden"></div>
                )}
            </div>

            {!error && (
                <div className="p-8 text-center text-gray-300">
                    Position the barcode inside the frame. It will scan automatically.
                </div>
            )}
        </div>
    );
}
