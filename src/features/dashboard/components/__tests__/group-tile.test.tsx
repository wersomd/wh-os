import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { Briefcase } from "lucide-react";
import { GroupTile, TileRow } from "../group-tile";

describe("GroupTile", () => {
  it("renders the group title and links its header to the group landing page", () => {
    const html = renderToStaticMarkup(
      <GroupTile id="work" title="Работа" icon={Briefcase}>
        <TileRow href="/tasks" label="Открытых задач" value="3" />
      </GroupTile>,
    );
    expect(html).toContain("Работа");
    expect(html).toContain('href="/groups/work"');
  });

  it("applies the group's accent background", () => {
    const html = renderToStaticMarkup(
      <GroupTile id="money" title="Деньги" icon={Briefcase}>
        <TileRow href="/finances" label="Баланс" value="—" />
      </GroupTile>,
    );
    expect(html).toContain("bg-group-money-soft");
  });
});

describe("TileRow", () => {
  it("renders label, value, and links to the given href", () => {
    const html = renderToStaticMarkup(
      <TileRow href="/tasks" label="Открытых задач" value="3" />,
    );
    expect(html).toContain('href="/tasks"');
    expect(html).toContain("Открытых задач");
    expect(html).toContain(">3<");
  });

  it("applies destructive styling when alert is true", () => {
    const html = renderToStaticMarkup(
      <TileRow href="/tasks" label="Горит сегодня" value="2" alert />,
    );
    expect(html).toContain("text-destructive");
  });

  it("omits destructive styling when alert is false or absent", () => {
    const html = renderToStaticMarkup(
      <TileRow href="/tasks" label="Открытых задач" value="3" />,
    );
    expect(html).not.toContain("text-destructive");
  });
});
