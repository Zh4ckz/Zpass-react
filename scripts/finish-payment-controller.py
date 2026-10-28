from pathlib import Path
import shutil
r=Path(r'C:\Users\rezan\Desktop\Bots\Payment-bot')
p=r/'PAYMENT-BOT-CONTROL.ps1';s=p.read_text(encoding='utf-8-sig');a=s.index('  if (-not $endpoint) {',s.index('function Update-StripeWebhook'));b=s.index('\n}\n\nfunction Update-CombinedLinks',a)
s=s[:a]+'''  $events=@('checkout.session.completed','invoice.paid','customer.subscription.updated','customer.subscription.deleted')
  $body=@{url=$webhookUrl;description='ZPass local payment bot'}
  for($i=0;$i -lt $events.Count;$i++){ $body["enabled_events[$i]"]=$events[$i] }
  if (-not $endpoint -or -not $knownSecret) {
    $created=Invoke-RestMethod -Uri 'https://api.stripe.com/v1/webhook_endpoints' -Headers $headers -Method Post -ContentType 'application/x-www-form-urlencoded' -Body $body
    if(-not $created.secret){throw 'Stripe webhook signing secret was not returned.'}
    Set-EnvValue 'STRIPE_WEBHOOK_SECRET' $created.secret
    Set-EnvValue 'STRIPE_WEBHOOK_ENDPOINT_ID' $created.id
    Write-Host 'Stripe signed webhook configured.'
  } else {
    Invoke-RestMethod -Uri "https://api.stripe.com/v1/webhook_endpoints/$($endpoint.id)" -Headers $headers -Method Post -ContentType 'application/x-www-form-urlencoded' -Body $body | Out-Null
  }'''+s[b:]
s=s.replace("  $endpoint = $endpoints.data | Where-Object { $_.url -match '/stripe-webhook$' } | Select-Object -First 1", "  $endpointId=Get-EnvValue 'STRIPE_WEBHOOK_ENDPOINT_ID'\n  $endpoint=$endpoints.data | Where-Object { $_.id -eq $endpointId -or $_.description -eq 'ZPass local payment bot' } | Select-Object -First 1\n  if(-not $endpoint -and -not $endpointId){$endpoint=$endpoints.data | Where-Object { $_.url -match '/stripe-webhook$' } | Select-Object -First 1}")
s=s.replace("  Read-Host 'Cikmak icin Enter'","  if($env:ZH4CKZ_MASTER -ne '1'){Read-Host 'Cikmak icin Enter'}\n  exit 1")
p.write_text(s,encoding='utf-8-sig')
for name in ['zpass_checkout_queue.py','zpass_web_bridge.py']:shutil.copyfile(Path('Zpass/scripts')/name,r/name)
p=Path('Zpass/scripts/START-ALL-BOTS.ps1');s=p.read_text();s=s.replace("$ErrorActionPreference='Stop'","$ErrorActionPreference='Stop'\n$env:ZH4CKZ_MASTER='1'");p.write_text(s);shutil.copyfile(p,r.parent/p.name)
# Store the final controller source alongside the integration for review and recovery.
shutil.copyfile(r/'PAYMENT-BOT-CONTROL.ps1','Zpass/scripts/PAYMENT-BOT-CONTROL.ps1')
