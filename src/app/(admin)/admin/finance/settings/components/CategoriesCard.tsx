import EntityLink from "@/components/admin/EntityLink";
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
      renderPrimary={(c) => (
        <EntityLink href={`/admin/finance/expenses?category=${c.id}`}>{c.name}</EntityLink>
      )}
      renderSecondary={(c) => `${c.expenseCount} expenses`}
    />
  );
}
