import UnwrapClient from "./unwrap-client";

export default async function UnwrapPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <UnwrapClient token={token} />;
}
