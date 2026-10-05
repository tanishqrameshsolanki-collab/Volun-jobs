async function test() {
  const r = await fetch('http://localhost:3000');
  const html = await r.text();
  const cssMatch = html.match(/href="(\/_next\/static\/css\/[^"]+)"/);
  console.log('CSS URL in HTML:', cssMatch ? cssMatch[1] : 'NONE');
  if (cssMatch) {
    const cssRes = await fetch('http://localhost:3000' + cssMatch[1]);
    console.log('CSS HTTP Status:', cssRes.status);
    console.log('CSS Content-Type:', cssRes.headers.get('content-type'));
    const cssText = await cssRes.text();
    console.log('CSS Byte Length:', cssText.length);
    console.log('First 100 chars:', cssText.slice(0, 100));
  }
}
test().catch(console.error);
