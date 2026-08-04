const http = require("http");
const data = JSON.stringify({type:"salon",name:"test",phone:"13800138000"});
const opts = {
  hostname: "127.0.0.1",
  port: 3002,
  path: "/api/bookings",
  method: "POST",
  headers: {"Content-Type":"application/json","Content-Length": Buffer.byteLength(data)}
};
const req = http.request(opts, res => {
  let body = "";
  res.on("data", c => body += c);
  res.on("end", () => console.log("Status:", res.statusCode, "Body:", body));
});
req.write(data);
req.end();
