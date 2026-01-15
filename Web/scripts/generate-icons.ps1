
Add-Type -AssemblyName System.Drawing

$sourcePath = "src\app\icon.png"
$target192 = "public\icons\icon-192x192.png"
$target512 = "public\icons\icon-512x512.png"

function Resize-Image {
    param (
        [string]$source,
        [string]$destination,
        [int]$width,
        [int]$height
    )

    Write-Host "Processing $destination ($width x $height)..."

    try {
        $srcImage = [System.Drawing.Image]::FromFile($source)
        $bmp = New-Object System.Drawing.Bitmap $width, $height
        $graph = [System.Drawing.Graphics]::FromImage($bmp)
        
        $graph.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graph.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graph.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

        $graph.DrawImage($srcImage, (New-Object System.Drawing.Rectangle 0, 0, $width, $height))
        
        $bmp.Save($destination, [System.Drawing.Imaging.ImageFormat]::Png)
        
        $graph.Dispose()
        $bmp.Dispose()
        $srcImage.Dispose()
        
        Write-Host "Success!"
    } catch {
        Write-Host "Error processing image: $_"
        exit 1
    }
}

Resize-Image -source $sourcePath -destination $target192 -width 192 -height 192
Resize-Image -source $sourcePath -destination $target512 -width 512 -height 512
