import {
  Box,
  ClickAwayListener,
  ListItemText,
  MenuItem,
  MenuList,
  Paper,
  Popper,
  Typography,
} from "@mui/material";
import type { SlashCommand } from "../commands";

interface SlashCommandMenuProps {
  anchorEl: HTMLDivElement | null;
  open: boolean;
  matches: SlashCommand[];
  selectedIndex: number;
  onSelect: (cmd: string) => void;
  onHover: (index: number) => void;
  onClose: () => void;
}

export default function SlashCommandMenu({
  anchorEl,
  open,
  matches,
  selectedIndex,
  onSelect,
  onHover,
  onClose,
}: SlashCommandMenuProps) {
  return (
    <Popper
      open={open}
      anchorEl={anchorEl}
      placement="top-start"
      style={{ zIndex: 1300, width: anchorEl?.clientWidth }}
    >
      <ClickAwayListener onClickAway={onClose}>
        <Paper
          elevation={6}
          sx={{ mx: 2, mb: 0.5, borderRadius: 2, border: "1px solid", borderColor: "divider" }}
        >
          <Box sx={{ px: 1.5, py: 0.75 }}>
            <Typography variant="caption" color="text.secondary">
              Commands — focus the assistant on one module
            </Typography>
          </Box>
          <MenuList dense disablePadding sx={{ pb: 0.5 }}>
            {matches.map((c, i) => (
              <MenuItem
                key={c.cmd}
                selected={i === selectedIndex}
                onMouseEnter={() => onHover(i)}
                onClick={() => onSelect(c.cmd)}
                sx={{ borderRadius: 1, mx: 0.5 }}
              >
                <ListItemText
                  primary={c.cmd}
                  secondary={c.desc}
                  slotProps={{
                    primary: { style: { fontWeight: 600, fontSize: "0.8125rem" } },
                    secondary: { style: { fontSize: "0.75rem" } },
                  }}
                />
              </MenuItem>
            ))}
          </MenuList>
        </Paper>
      </ClickAwayListener>
    </Popper>
  );
}
