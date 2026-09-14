import { test, expect, type Page } from "@playwright/test";
async function openStudio(page: Page) {
  await page.goto("/");
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
    .getByRole("button", { name: "Digital studio", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ideas into legacy." }),
  ).toBeVisible();
}
async function tab(page: Page, name: string) {
  await page
    .getByRole("navigation", { name: "Studio navigation" })
    .getByRole("button", { name, exact: true })
    .click();
}
test("Studio sections render at desktop and mobile sizes without errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await openStudio(page);
  for (const name of [
    "Create",
    "Campaigns",
    "Calendar",
    "Assets",
    "Brands",
    "Analytics",
    "Overview",
  ]) {
    await tab(page, name);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  }
  await page.getByRole("button", { name: "Studio connections" }).click();
  await expect(page.getByText("Export only", { exact: true })).toHaveCount(5);
  expect(errors).toEqual([]);
});
test("create a brand, campaign and content, schedule, review, and export", async ({
  page,
}) => {
  await openStudio(page);
  await tab(page, "Brands");
  await page.getByRole("button", { name: "New brand", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Studio test brand");
  await page.getByLabel("Tone & voice").fill("Specific, grounded and warm.");
  await page
    .getByRole("combobox", { name: "Visibility", exact: true })
    .selectOption("shared");
  await page
    .getByRole("button", { name: "Save for Juntos", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await tab(page, "Campaigns");
  await page.getByRole("button", { name: "New campaign", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Studio launch");
  await page
    .getByRole("combobox", { name: "Brand", exact: true })
    .selectOption({ label: "Studio test brand · shared" });
  await page
    .getByLabel("Objective", { exact: true })
    .fill("Introduce our work");
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await page.getByRole("button", { name: /Studio launch/ }).click();
  await page.getByRole("button", { name: "Add content", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Founder opening reel");
  await page
    .getByLabel("Script / copy", { exact: true })
    .fill("Here is what we learned from building this.");
  await page.getByLabel("Due / planned posting time").fill("2026-09-20T12:00");
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await tab(page, "Calendar");
  await page.getByRole("button", { name: "list", exact: true }).click();
  await page.getByRole("button", { name: /Founder opening reel/ }).click();
  await page
    .getByLabel("Feedback", { exact: true })
    .fill("Strong opening. Keep the honest tone.");
  await page
    .getByRole("combobox", { name: "Review action", exact: true })
    .selectOption("approved");
  await page.getByRole("button", { name: "Save review", exact: true }).click();
  await expect(
    page.getByText("Strong opening. Keep the honest tone.", { exact: true }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export production package" }).click();
  expect((await download).suggestedFilename()).toContain(
    "production-package.json",
  );
});
test("Apollo saves an honest production brief without credentials", async ({
  page,
}) => {
  await openStudio(page);
  await tab(page, "Create");
  await page
    .getByLabel("Your creative brief", { exact: true })
    .fill("Build a founder series around the craft of our work.");
  await expect(
    page.getByRole("button", { name: "Create with Apollo", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Save production brief", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("No media yet.", { exact: false })).toBeVisible();
});
test("private Studio ideas stay out of Juntos filter and the other identity", async ({
  page,
}) => {
  await openStudio(page);
  await page
    .getByRole("button", { name: "Capture an idea", exact: true })
    .click();
  await page
    .getByLabel("Title", { exact: true })
    .fill("Private Studio boundary");
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await page
    .locator(".studio-persistent-apollo")
    .getByRole("button", { name: "Ideas", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Private Studio boundary/ }),
  ).toBeVisible();
  await page
    .locator(".studio-toolbar")
    .getByRole("button", { name: "Juntos", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Private Studio boundary/ }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Privacy settings", exact: true })
    .click();
  await page.getByLabel("Sample identity").selectOption({ label: "Kamilla" });
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page
    .locator(".studio-persistent-apollo")
    .getByRole("button", { name: "Ideas", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Private Studio boundary/ }),
  ).toHaveCount(0);
});
