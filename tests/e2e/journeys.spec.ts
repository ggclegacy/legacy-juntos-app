import { test, expect, type Page } from "@playwright/test";
async function nav(page: Page, name: string) {
  if (
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .isVisible()
  )
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name, exact: true })
    .click();
}
async function start(page: Page) {
  await page.goto("/");
  await expect(
    page.getByText("Sample workspace · illustrative entries"),
  ).toBeVisible();
}
async function addPrivate(page: Page, title: string) {
  await page
    .getByRole("button", { name: "Add something", exact: true })
    .click();
  await page.getByLabel("Title", { exact: true }).fill(title);
  await page
    .getByLabel("Your words", { exact: true })
    .fill("A private thought for this test.");
  await page
    .getByRole("button", { name: "Save privately", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
test("all workspaces render without browser errors or horizontal overflow", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  for (const name of [
    "My life",
    "Faith",
    "Performance",
    "Know & connect",
    "Business",
    "Digital studio",
    "Conversations",
    "Our vision",
    "Memories",
    "Give & serve",
    "Our space",
  ]) {
    await nav(page, name);
    await expect(page.locator("main h1:visible")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});
test("private entry stays out of Juntos and the other sample identity", async ({
  page,
}) => {
  await start(page);
  await nav(page, "My life");
  await addPrivate(page, "Privacy boundary check");
  await expect(
    page.getByRole("button", { name: "Privacy boundary check Goal" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Juntos", exact: true }).click();
  await expect(
    page.getByText("Privacy boundary check", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Privacy settings", exact: true })
    .click();
  await page.getByLabel("Sample identity").selectOption({ label: "Kamilla" });
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "My space", exact: true }).click();
  await expect(
    page.getByText("Privacy boundary check", { exact: true }),
  ).toHaveCount(0);
});
test("sharing requires explicit confirmation and can be revoked", async ({
  page,
}) => {
  await start(page);
  await nav(page, "My life");
  await addPrivate(page, "Deliberate sharing");
  await page
    .getByRole("button", { name: "Open Deliberate sharing", exact: true })
    .click();
  await page.getByRole("button", { name: "Edit / change audience" }).click();
  await page.getByLabel("Who can see this?").selectOption("shared");
  await page.getByRole("button", { name: "Save & share" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "confirm the audience",
  );
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Save & share" }).click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Juntos", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Open Deliberate sharing", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Open Deliberate sharing", exact: true })
    .click();
  await page.getByRole("button", { name: "Edit / change audience" }).click();
  await page.getByLabel("Who can see this?").selectOption("private");
  await page.getByRole("button", { name: "Save privately" }).click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(
    page.getByText("Deliberate sharing", { exact: true }),
  ).toHaveCount(0);
});
test("private communication guide never sends or shares automatically", async ({
  page,
}) => {
  await start(page);
  await page.getByRole("button", { name: "Open Apollo", exact: true }).click();
  await page
    .getByLabel("Your starting point")
    .fill("I would like to clarify our plans.");
  await expect(
    page.getByRole("button", { name: "Ask Apollo", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Voice · soon", exact: true }).click();
  await expect(
    page.getByText("Voice is planned.", { exact: false }),
  ).toBeVisible();
  await page.getByText("Find my words · a private writing guide", { exact: true }).click();
  await page.getByRole("button", { name: "Open a private draft" }).click();
  await expect(page.getByLabel("Your words")).toContainText(
    "I would like to clarify our plans.",
  );
  await expect(page.getByLabel("Who can see this?")).toHaveValue("private");
  await page.getByRole("button", { name: "Save privately" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("project task inherits shared audience and cannot silently widen it", async ({
  page,
}) => {
  await start(page);
  await nav(page, "Business");
  await page.getByRole("button", { name: "Juntos", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Open The next chapter of recovery",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Add linked task" }).click();
  await page
    .getByLabel("Title", { exact: true })
    .fill("Review the creative brief");
  await expect(page.getByLabel("Who can see this?")).toHaveValue("shared");
  await expect(page.getByLabel("Who can see this?")).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Save & share" }).click();
  await expect(
    page.getByRole("button", { name: "Open task", exact: true }),
  ).toBeVisible();
});
test("faith reflection starts private and AI context does not persist across audience changes", async ({
  page,
}) => {
  await start(page);
  await nav(page, "Faith");
  await page
    .getByRole("button", { name: "Reflect privately", exact: true })
    .click();
  await expect(page.getByLabel("Who can see this?")).toHaveValue("private");
  await expect(page.getByLabel("Passage reference")).toHaveValue(
    "Colossians 3:12–17",
  );
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Open Apollo", exact: true }).click();
  await page.getByLabel("Your starting point").fill("Private working thought");
  await page
    .getByRole("button", { name: "Juntos context", exact: true })
    .click();
  await expect(page.getByLabel("Your starting point")).toHaveValue("");
});
test("protected API routes reject unauthenticated access", async ({
  request,
}) => {
  for (const route of ["/api/records", "/api/bootstrap", "/api/training"]) {
    const r = await request.get(route);
    expect(r.status()).toBe(401);
    expect((await r.json()).error).toContain("Sign in");
  }
  const ai = await request.post("/api/ai", { data: { message: "hello" } });
  expect(ai.status()).toBe(401);
});

test("material depth respects pointer and reduced-motion preferences", async ({
  page,
  isMobile,
}) => {
  await start(page);
  const art = await page.request.get("/art/juntos-horizon.webp");
  expect(art.ok()).toBe(true);
  const card = page.locator(".pathway").first();
  await card.scrollIntoViewIfNeeded();
  if (!isMobile) {
    await card.hover({ position: { x: 30, y: 30 } });
    await expect(card).toHaveAttribute("data-lit", "true");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(card).not.toHaveAttribute("data-lit");
    await expect(card).toHaveCSS("transform", "none");
  } else {
    await expect(card).not.toHaveAttribute("data-lit");
  }
});
