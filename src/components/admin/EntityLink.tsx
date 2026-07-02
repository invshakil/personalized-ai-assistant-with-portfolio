"use client";

import type { ReactNode, MouseEvent } from "react";
import { Typography, type TypographyProps } from "@mui/material";
import Link from "next/link";

interface EntityLinkProps extends Pick<TypographyProps, "variant" | "sx"> {
  href: string;
  children: ReactNode;
  /** Set when nested inside another Typography's text flow (e.g. "{unit} · {floor}"). */
  inline?: boolean;
  /** Set when nested inside an already-clickable row/card that navigates elsewhere. */
  stopPropagation?: boolean;
}

/**
 * Inline link styling for entity references (tenant/unit/payee names) shown inside
 * tables and cards — hover-underlines and tints primary, otherwise blends with body text.
 * Always renders a <span> tag (safe to nest inside any Typography) but defaults to
 * block display so it behaves like the Typography it's replacing; pass `inline` when
 * embedding mid-sentence inside another Typography's text.
 */
export default function EntityLink({
  href,
  children,
  inline,
  stopPropagation,
  variant = "body2",
  sx,
}: EntityLinkProps) {
  function onClick(e: MouseEvent) {
    if (stopPropagation) e.stopPropagation();
  }

  return (
    <Typography
      component="span"
      variant={variant}
      sx={{
        display: inline ? "inline" : "block",
        color: "inherit",
        textDecoration: "none",
        "&:hover": { color: "primary.main", textDecoration: "underline" },
        ...sx,
      }}
    >
      <Link href={href} onClick={onClick} style={{ color: "inherit", textDecoration: "inherit" }}>
        {children}
      </Link>
    </Typography>
  );
}
