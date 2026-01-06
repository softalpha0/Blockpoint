import PayClient from "./PayClient";

export const dynamic = "force-dynamic";

export default async function PayPage({
  params,
}: {
  params: Promise<{ code: string }> | { code: string };
}) {
  const p = (typeof (params as any)?.then === "function" ? await (params as Promise<any>) : params) as {
    code?: string;
  };

  const code = String(p?.code || "").trim();
  return <PayClient code={code} />;
}
