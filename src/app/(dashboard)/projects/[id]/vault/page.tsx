import VaultPage from "@/app/(dashboard)/vault/page";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectVaultPage({ params }: Props) {
  const { id } = await params;
  return <VaultPage projectId={id} />;
}
