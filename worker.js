importScripts('process.js');
self.onmessage = async function (e) {
  var d = e.data;
  try {
    var r = await self.LS.processImage(d.file, d.opts, d.logo);
    self.postMessage({ id: d.id, ok: true, res: r });
  } catch (err) {
    self.postMessage({ id: d.id, ok: false, err: String(err && err.message || err) });
  }
};
