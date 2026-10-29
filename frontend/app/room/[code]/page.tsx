import RoomClient from "./RoomClient";

export function generateStaticParams() {
  return [{ code: "123456" }];
}

export default function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  return <RoomClient params={params} />;
}
