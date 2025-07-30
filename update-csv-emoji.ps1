# PowerShell script to add emoji to Significance column and remove Time column

$inputFile = "42-mill-st-timeline.csv"  # Your current file
$outputFile = "42_Mill_St_Timeline_Overview.csv"
$githubBaseUrl = "https://github.com/tdemelle-SiP/bakers_pond/blob/master"

# Emoji mapping
$emojiMap = @{
    "critical" = "🟡 critical"
    "formality" = "🔵 formality"
    "b/g communication" = "🟣 b/g communication"
    "privileged" = "🔴 privileged"
    "color" = "⚪ color"
}

# Read the CSV
$csv = Import-Csv $inputFile

# Process each row
$newRows = @()
foreach ($row in $csv) {
    # Create new row without Time column
    $newRow = [PSCustomObject]@{
        Date = $row.Date
        Event_Description = $row.Event_Description
        Document_Type = $row.Document_Type
        Significance = if ($emojiMap.ContainsKey($row.Significance)) { $emojiMap[$row.Significance] } else { $row.Significance }
        Entity = $row.Entity
        Source_Document = $row.Source_Document
        File_Link = $row.File_Link
        Display_Date = $row.Display_Date
        Notes = $row.Notes
        Status = $row.Status
    }
    
    # Convert File_Link to markdown format if it's a relative path
    if ($newRow.File_Link -and $newRow.File_Link.StartsWith("./Dated Documents/")) {
        # Remove the ./ prefix
        $relativePath = $newRow.File_Link.Substring(2)
        # URL encode the path
        $encodedPath = $relativePath.Replace(" ", "%20")
        # Create full GitHub URL
        $fullUrl = "$githubBaseUrl/$encodedPath"
        # Extract just the filename for link text
        $filename = Split-Path $relativePath -Leaf
        # Convert to markdown link format
        $newRow.File_Link = "[$filename]($fullUrl)"
    }
    
    $newRows += $newRow
}

# Define the column order (without Time)
$columnOrder = @('Date', 'Event_Description', 'Document_Type', 'Significance', 'Entity', 'Source_Document', 'File_Link', 'Display_Date', 'Notes', 'Status')

# Export the updated CSV with specified column order
$newRows | Select-Object $columnOrder | Export-Csv -Path $outputFile -NoTypeInformation -Encoding UTF8

Write-Host "CSV updated with emoji indicators and Time column removed!" -ForegroundColor Green
Write-Host "Saved as: $outputFile" -ForegroundColor Yellow
Write-Host ""
Write-Host "Emoji mapping applied:" -ForegroundColor Cyan
Write-Host "🟡 critical" -ForegroundColor Yellow
Write-Host "🔵 formality" -ForegroundColor Blue
Write-Host "🟣 b/g communication" -ForegroundColor Magenta
Write-Host "🔴 privileged" -ForegroundColor Red
Write-Host "⚪ color" -ForegroundColor White