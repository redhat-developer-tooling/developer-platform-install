param([string]$url, [String]$output)

$ErrorActionPreference = "Stop";

if([String]::IsNullOrEmpty($url)) {
    "The url is empty"
    exit 1
} else {
    'Download ' + $url
    'To ' + $output
    $wc = New-Object System.Net.WebClient
    $wc.DownloadFile($url, $output)
}
