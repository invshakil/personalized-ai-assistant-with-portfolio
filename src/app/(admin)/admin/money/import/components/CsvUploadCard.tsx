import type { RefObject } from "react";
import { Card, CardContent, Typography, Button } from "@mui/material";
import { Upload } from "lucide-react";

interface CsvUploadCardProps {
  fileRef: RefObject<HTMLInputElement | null>;
  file: File | null;
  onFile: (f: File | null) => void;
}

/** Step 1 of the import wizard: hidden file input + trigger button. */
export default function CsvUploadCard({ fileRef, file, onFile }: CsvUploadCardProps) {
  return (
    <Card sx={{ bgcolor: "background.paper", mb: 3 }}>
      <CardContent>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          1 · Choose a CSV file
        </Typography>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          style={{ display: "none" }}
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
        <Button
          variant="outlined"
          startIcon={<Upload size={16} />}
          onClick={() => fileRef.current?.click()}
        >
          {file ? file.name : "Select CSV"}
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          First row must be column headers. Dates as YYYY-MM-DD (or DD/MM/YYYY). Amounts may include
          ৳ and commas.
        </Typography>
      </CardContent>
    </Card>
  );
}
