import type { SourceRow } from "../../types";
import SettingsListCard from "./SettingsListCard";

interface Props {
  sources: SourceRow[];
  onAdd: () => void;
  onEdit: (item: SourceRow) => void;
  onDelete: (id: string) => void;
}

export default function SourcesCard({ sources, onAdd, onEdit, onDelete }: Props) {
  return (
    <SettingsListCard
      title="Clients"
      items={sources}
      onAdd={onAdd}
      onEdit={onEdit}
      onDelete={onDelete}
      renderPrimary={(s) => s.name}
      renderSecondary={(s) => `${s.earningCount} earnings`}
    />
  );
}
