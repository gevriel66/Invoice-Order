param (
    [string]$docType,
    [string]$jsonFile
)

$excel = $null
$wb = $null

function Get-WorksheetByName($workbook, $sheetName) {
    foreach ($sheet in $workbook.Worksheets) {
        if ($sheet.Name -eq $sheetName) {
            return $sheet
        }
    }
    return $null
}

try {
    if (-not (Test-Path -Path $jsonFile)) {
        throw "JSON input file not found: $jsonFile"
    }

    $jsonContent = Get-Content -Path $jsonFile -Raw -Encoding UTF8
    $order = $jsonContent | ConvertFrom-Json

    $baseDir = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
    
    # Resolve directories
    $storageInvDir = Join-Path $baseDir "storage\documents\invoice"
    $storageSjDir = Join-Path $baseDir "storage\documents\surat-jalan"
    $tempDir = Join-Path $baseDir "temp"

    New-Item -ItemType Directory -Force -Path $storageInvDir -ErrorAction SilentlyContinue | Out-Null
    New-Item -ItemType Directory -Force -Path $storageSjDir -ErrorAction SilentlyContinue | Out-Null
    New-Item -ItemType Directory -Force -Path $tempDir -ErrorAction SilentlyContinue | Out-Null

    # Graceful check for Microsoft Excel COM Engine installation
    try {
        $excel = New-Object -ComObject Excel.Application
    }
    catch {
        throw "Microsoft Excel tidak terinstall atau COM Automation tidak diaktifkan pada server Windows ini."
    }

    $excel.Visible = $false
    $excel.DisplayAlerts = $false

    $invNumClean = if ($order.invoice_number) { $order.invoice_number.Replace('/', '_') } else { "DRAFT_" + $order.id }
    $result = @{}

    # 1. Generate Invoice PDF Workflow
    if ($docType -eq 'invoice' -or $docType -eq 'both') {
        $masterInvTemplate = Join-Path $baseDir "Invoice Pembelian Bahan.xlsx"
        if (-not (Test-Path -Path $masterInvTemplate)) {
            throw "Master Template Invoice tidak ditemukan pada lokasi: $masterInvTemplate"
        }

        # Copy Master Template to temporary file
        $tempInvExcel = Join-Path $tempDir "temp_invoice_$invNumClean.xlsx"
        Copy-Item -Path $masterInvTemplate -Destination $tempInvExcel -Force

        $pdfInvName = "Invoice_$invNumClean.pdf"
        $pdfInvPath = Join-Path $storageInvDir $pdfInvName

        try {
            $wb = $excel.Workbooks.Open($tempInvExcel)

            # Validate target worksheet existence
            $ws = Get-WorksheetByName $wb "Form Input"
            if ($ws -eq $null) {
                throw "Worksheet 'Form Input' tidak ditemukan pada template Invoice Pembelian Bahan.xlsx"
            }

            # Exclusively Select and Activate target worksheet (preserves full workbook structure)
            $ws.Select($true)
            $ws.Activate()

            # Fill Header Info
            if ($order.order_date) { $ws.Range("E3").Value2 = [string]$order.order_date }
            if ($order.due_date) { $ws.Range("E4").Value2 = [string]$order.due_date }
            if ($order.po_number) { $ws.Range("E5").Value2 = [string]$order.po_number }
            if ($order.invoice_number) { $ws.Range("E6").Value2 = [string]$order.invoice_number } else { $ws.Range("E6").Value2 = "DRAFT-" + $order.id }

            if ($order.sender_info) { $ws.Range("A7").Value2 = [string]$order.sender_info }

            # Bill to (A10): Only customer name snapshot without company in parentheses
            $ws.Range("A10").Value2 = [string]$order.customer_name_snapshot

            # Fill Line Items (Row 14 to 22)
            $startRow = 14
            $maxRows = 9

            for ($r = $startRow; $r -lt ($startRow + $maxRows); $r++) {
                $ws.Cells.Item($r, 1).Value2 = $null
                $ws.Cells.Item($r, 2).Value2 = $null
                $ws.Cells.Item($r, 3).Value2 = $null
                $ws.Cells.Item($r, 4).Value2 = $null
                $ws.Cells.Item($r, 5).Value2 = $null
            }

            $items = $order.items
            $itemCount = $items.Count

            # Unhide rows that will contain items, hide empty rows (template has rows 15-20 hidden)
            # Show 1 extra empty row after last item as spacer before Total
            for ($r = $startRow; $r -lt ($startRow + $maxRows); $r++) {
                $rowIndex = $r - $startRow
                if ($rowIndex -lt $itemCount -or $rowIndex -eq $itemCount) {
                    $ws.Rows.Item($r).Hidden = $false
                } else {
                    $ws.Rows.Item($r).Hidden = $true
                }
            }

            for ($i = 0; $i -lt [Math]::Min($itemCount, $maxRows); $i++) {
                $item = $items[$i]
                $r = $startRow + $i

                $ws.Cells.Item($r, 1).Value2 = [string]$item.product_name_snapshot
                $ws.Cells.Item($r, 2).Value2 = [double]$item.price_snapshot
                $ws.Cells.Item($r, 3).Value2 = [string]$item.unit_snapshot
                $ws.Cells.Item($r, 4).Value2 = [double]$item.quantity
                $ws.Cells.Item($r, 5).Formula = "=B$r*D$r"
            }

            if ($order.notes) {
                $ws.Range("A27").Value2 = [string]$order.notes
            }

            # Replace Logo with External File Logo-Invoice.jpg if available (msoFalse = 0, msoTrue = -1)
            $extLogoInv = Join-Path $baseDir "Logo-Invoice.jpg"
            if (Test-Path $extLogoInv) {
                for ($s = $ws.Shapes.Count; $s -ge 1; $s--) {
                    $shape = $ws.Shapes.Item($s)
                    if ($shape.Type -eq 13) { # Type 13 = msoPicture
                        $shape.Delete()
                    }
                }
                $ws.Shapes.AddPicture($extLogoInv, 0, -1, 0, 0.6, 80.4, 81.63) | Out-Null
            }

            # Export ONLY worksheet 'Form Input' to PDF
            $ws.ExportAsFixedFormat(0, $pdfInvPath)
        }
        finally {
            if ($wb -ne $null) {
                $wb.Close($false)
                $wb = $null
            }
            if (Test-Path -Path $tempInvExcel) {
                Remove-Item -Path $tempInvExcel -Force -ErrorAction SilentlyContinue
            }
        }

        $result['invoice_pdf_path'] = "storage/documents/invoice/$pdfInvName"
    }

    # 2. Generate Surat Jalan PDF Workflow
    if ($docType -eq 'surat_jalan' -or $docType -eq 'both') {
        $masterSjTemplate = Join-Path $baseDir "Surat_Jalan_Barang.xlsx"
        if (-not (Test-Path -Path $masterSjTemplate)) {
            throw "Master Template Surat Jalan tidak ditemukan pada lokasi: $masterSjTemplate"
        }

        # Copy Master Template to temporary file
        $tempSjExcel = Join-Path $tempDir "temp_sj_$invNumClean.xlsx"
        Copy-Item -Path $masterSjTemplate -Destination $tempSjExcel -Force

        $pdfSjName = "Surat_Jalan_$invNumClean.pdf"
        $pdfSjPath = Join-Path $storageSjDir $pdfSjName

        try {
            $wb = $excel.Workbooks.Open($tempSjExcel)

            # Validate target worksheet existence
            $ws = Get-WorksheetByName $wb "Surat Jalan Barang"
            if ($ws -eq $null) {
                throw "Worksheet 'Surat Jalan Barang' tidak ditemukan pada template Surat_Jalan_Barang.xlsx"
            }

            # Exclusively Select and Activate target worksheet
            $ws.Select($true)
            $ws.Activate()

            # Header Info: Leave Sender Info (C4) and Recipient Info (C5) blank as requested
            $ws.Range("C4").Value2 = $null
            $ws.Range("C5").Value2 = $null

            # Fill Line Items (Row 8 to 11)
            $startRow = 8
            $maxRows = 4

            for ($r = $startRow; $r -lt ($startRow + $maxRows); $r++) {
                $ws.Cells.Item($r, 2).Value2 = $null
                $ws.Cells.Item($r, 3).Value2 = $null
                $ws.Cells.Item($r, 4).Value2 = $null
                $ws.Cells.Item($r, 5).Value2 = $null
                $ws.Cells.Item($r, 6).Value2 = $null
            }

            $items = $order.items
            $itemCount = $items.Count

            # Unhide rows that will contain items, hide empty rows (template has row 9 hidden)
            # Show 1 extra empty row after last item as spacer if space permits
            for ($r = $startRow; $r -lt ($startRow + $maxRows); $r++) {
                $rowIndex = $r - $startRow
                if ($rowIndex -lt $itemCount -or $rowIndex -eq $itemCount) {
                    $ws.Rows.Item($r).Hidden = $false
                } else {
                    $ws.Rows.Item($r).Hidden = $true
                }
            }

            for ($i = 0; $i -lt [Math]::Min($itemCount, $maxRows); $i++) {
                $item = $items[$i]
                $r = $startRow + $i

                $ws.Cells.Item($r, 2).Value2 = [double]($i + 1)
                $ws.Cells.Item($r, 3).Value2 = [string]$item.product_name_snapshot
                $ws.Cells.Item($r, 4).Value2 = [string]$item.brand
                $ws.Cells.Item($r, 5).Value2 = [double]$item.quantity
                $ws.Cells.Item($r, 6).Value2 = [string]$item.unit_snapshot
            }

            # Replace Logo with External File Logo-SuratJalan.png if available (msoFalse = 0, msoTrue = -1)
            $extLogoSj = Join-Path $baseDir "Logo-SuratJalan.png"
            if (Test-Path $extLogoSj) {
                for ($s = $ws.Shapes.Count; $s -ge 1; $s--) {
                    $shape = $ws.Shapes.Item($s)
                    if ($shape.Type -eq 13) {
                        $shape.Delete()
                    }
                }
                $ws.Shapes.AddPicture($extLogoSj, 0, -1, 232.65, 8.4, 79.5, 57.35) | Out-Null
            }

            # Export ONLY worksheet 'Surat Jalan Barang' to PDF
            $ws.ExportAsFixedFormat(0, $pdfSjPath)
        }
        finally {
            if ($wb -ne $null) {
                $wb.Close($false)
                $wb = $null
            }
            if (Test-Path -Path $tempSjExcel) {
                Remove-Item -Path $tempSjExcel -Force -ErrorAction SilentlyContinue
            }
        }

        $result['surat_jalan_pdf_path'] = "storage/documents/surat-jalan/$pdfSjName"
    }

    $outObj = @{
        success = $true
        data = $result
    }
    Write-Output ($outObj | ConvertTo-Json -Compress)
}
catch {
    $errObj = @{
        success = $false
        error = $_.Exception.Message
    }
    Write-Output ($errObj | ConvertTo-Json -Compress)
    exit 1
}
finally {
    # Strictly release ONLY this specific COM instance spawned by the script
    if ($wb -ne $null) {
        try { $wb.Close($false) } catch {}
    }
    if ($excel -ne $null) {
        try {
            $excel.Quit()
            [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
        } catch {}
    }
}
