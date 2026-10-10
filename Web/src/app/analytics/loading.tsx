export default function Loading() {
    return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <div className="flex flex-col items-center gap-4 w-full max-w-2xl px-4">
                <div className="h-8 bg-background-tertiary rounded-md w-3/4" />
                <div className="h-4 bg-background-tertiary rounded-md w-1/2" />
                <div className="h-64 bg-background-tertiary rounded-md w-full mt-4" />
            </div>
        </div>
    );
}
