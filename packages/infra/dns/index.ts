import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

const apiKey = process.env.DREAMHOST_API_KEY;
if (!apiKey) {
  throw new Error("DREAMHOST_API_KEY is not set");
}

async function exec({
  cmd,
  record,
  type,
  value,
}: {
  cmd: string;
  record: string;
  type: string;
  value: string;
}) {
  const response = await fetch(
    `https://api.dreamhost.com/?key=${apiKey}&cmd=${cmd}&record=${record}&type=${type}&value=${value}`
  );
  return await response.text();
}

export async function setDomainIp(props: { domain: string; ip: string }) {
  const { domain, ip } = props;
  for (const record of [domain, `www.${domain}`, `*.${domain}`]) {
    console.log(`Setting ${record} to ${ip}`);
    console.log(await exec({ cmd: "dns-remove_record", record, type: "A", value: ip }));
    console.log(await exec({ cmd: "dns-add_record", record, type: "A", value: ip }));
  }
}
