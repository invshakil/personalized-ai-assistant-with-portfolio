import type { CategoryRow } from "../../types";
import SettingsListCard from "./SettingsListCard";

interface Props {
  categories: CategoryRow[];
  onAdd: () => void;
  onEdit: (item: CategoryRow) => void;
  onDelete: (id: string) => void;
}

export default function CategoriesCard({ categories, onAdd, onEdit, onDelete }: Props) {
  return (
    <SettingsListCard
      title="Expense Categories"
      items={categories}
      onAdd={onAdd}
      onEdit={onEdit}
      onDelete={onDelete}
      renderPrimary={(c) => c.name}
      renderSecondary={(c) => `${c.expenseCount} expenses`}
    />
  );
}
