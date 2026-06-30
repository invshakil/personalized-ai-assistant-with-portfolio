import { Alert, Box, Button } from "@mui/material";

interface LongThreadAlertProps {
  tokenCount: number;
  isStreaming: boolean;
  onNewChat: () => void;
}

export default function LongThreadAlert({
  tokenCount,
  isStreaming,
  onNewChat,
}: LongThreadAlertProps) {
  return (
    <Box sx={{ px: 2, pt: 1 }}>
      <Alert
        severity="info"
        variant="outlined"
        sx={{ py: 0, "& .MuiAlert-message": { py: 0.75 } }}
        action={
          <Button color="inherit" size="small" onClick={onNewChat} disabled={isStreaming}>
            New chat
          </Button>
        }
      >
        This chat is getting long (~{Math.round(tokenCount / 1000)}k tokens re-sent each turn).
        Start a new chat to lower cost.
      </Alert>
    </Box>
  );
}
