import type { ReactNode } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface SettingsListCardProps<T extends { id: string }> {
  title: string;
  items: T[];
  onAdd: () => void;
  onEdit: (item: T) => void;
  onDelete: (id: string) => void;
  renderPrimary: (item: T) => ReactNode;
  renderSecondary: (item: T) => string;
}

export default function SettingsListCard<T extends { id: string }>({
  title,
  items,
  onAdd,
  onEdit,
  onDelete,
  renderPrimary,
  renderSecondary,
}: SettingsListCardProps<T>) {
  return (
    <Card sx={{ bgcolor: "background.paper" }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>
            {title}
          </Typography>
          <Button size="small" startIcon={<Plus size={14} />} onClick={onAdd}>
            Add
          </Button>
        </Box>
        <List dense disablePadding>
          {items.map((item) => (
            <ListItem
              key={item.id}
              disableGutters
              secondaryAction={
                <Box>
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => onEdit(item)}>
                      <Pencil size={13} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" color="error" onClick={() => onDelete(item.id)}>
                      <Trash2 size={13} />
                    </IconButton>
                  </Tooltip>
                </Box>
              }
            >
              <ListItemText primary={renderPrimary(item)} secondary={renderSecondary(item)} />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
}
