'use client';

import { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Html5Qrcode } from 'html5-qrcode';
import { X } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onScan: (barcode: string) => void;
}

export function BarcodeScannerModal({ isOpen, onClose, onScan }: Props) {
    const [isNative, setIsNative] = useState(false);
    const [hasPermission, setHasPermission] = useState(false);
    const webScannerRef = useRef<Html5Qrcode | null>(null);

    useEffect(() => {
        setIsNative(Capacitor.isNativePlatform());
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        if (isNative) {
            // NATIVE CAPACITOR LOGIC
            const startNativeScanner = async () => {
                const { camera } = await BarcodeScanner.requestPermissions();
                if (camera === 'granted' || camera === 'limited') {
                    setHasPermission(true);
                    // Hide Next.js background to show native camera view beneath it!
                    document.body.classList.add('barcode-scanner-active');
                    document.body.style.background = 'transparent';
                    document.documentElement.style.background = 'transparent';

                    await BarcodeScanner.startScan();
                    BarcodeScanner.addListener('barcodesScanned', async (event: any) => {
                        if (event.barcodes && event.barcodes.length > 0) {
                            // Stop scanning after successful read
                            await stopNativeScanner();
                            onScan(event.barcodes[0].rawValue);
                        }
                    });
                }
            };
            startNativeScanner();
        } else {
            // WEB UI LOGIC (PWA / Browser)
            setHasPermission(true);
            const startWebScanner = async () => {
                try {
                    const html5QrCode = new Html5Qrcode("web-reader");
                    webScannerRef.current = html5QrCode;

                    await html5QrCode.start(
                        { facingMode: "environment" },
                        { fps: 10, qrbox: { width: 250, height: 250 } },
                        (decodedText) => {
                            stopWebScanner();
                            onScan(decodedText);
                        },
                        (error) => { /* ignore */ }
                    );
                } catch (err) {
                    console.error("Error starting web scanner:", err);
                }
            };

            // Small timeout to ensure the div is rendered before starting
            setTimeout(startWebScanner, 100);
        }

        return () => {
            if (isNative) {
                stopNativeScanner();
            } else {
                stopWebScanner();
            }
        };
    }, [isOpen, isNative]);

    const stopNativeScanner = async () => {
        document.body.classList.remove('barcode-scanner-active');
        document.body.style.background = ''; // Restore app background
        document.documentElement.style.background = '';
        await BarcodeScanner.stopScan();
        await BarcodeScanner.removeAllListeners();
    };

    const stopWebScanner = () => {
        if (webScannerRef.current) {
            try {
                webScannerRef.current.stop().then(() => {
                    webScannerRef.current?.clear();
                }).catch(console.error);
            } catch (err) {
                console.error("Scanner may not have been scanning", err);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-[100] flex flex-col pb-safe barcode-scanner-modal ${isNative ? 'bg-transparent' : 'bg-black/90'}`}>
            {isNative && (
                <div className="absolute inset-0 bg-black/60 z-0 select-none pointer-events-none" />
            )}

            <div className="flex justify-between items-center p-4 pt-12 relative z-10">
                <h2 className="text-white font-bold text-lg">Scan Barcode</h2>
                <button onClick={onClose} className="p-2 bg-white/10 rounded-full">
                    <X className="w-6 h-6 text-white" />
                </button>
            </div>

            <div className="flex-1 relative flex items-center justify-center">
                {isNative ? (
                    // In native, the video renders BEHIND the webview. We just create a transparent window.
                    <div className="w-64 h-64 border-2 border-green-500 bg-transparent rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
                ) : (
                    // In web, Html5Qrcode renders video elements directly inside this div
                    <div id="web-reader" className="w-full max-w-sm bg-white rounded-lg overflow-hidden"></div>
                )}
            </div>

            <div className="p-8 text-center text-gray-300">
                Position the barcode inside the frame. It will scan automatically.
            </div>
        </div>
    );
}
