import { test, expect, type Page } from "@playwright/test";
test.setTimeout(60000);
async function nav(page: Page, name = "Performance") {
  // Reload can resolve while the client is still opening the workspace.
  await expect(
    page.getByRole("button", { name: "Privacy settings", exact: true }),
  ).toBeVisible();
  const menu = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name, exact: true })
    .click();
}
async function setup(page: Page) {
  await page.goto("/");
  await nav(page);
  await expect(
    page.getByText("Saved on this device · sample account", { exact: true }),
  ).toBeVisible();
}
async function importPlan(page: Page) {
  await page.getByRole("button", { name: "Program", exact: true }).click();
  await page
    .getByRole("button", { name: "Add my program", exact: false })
    .click();
  await page
    .getByLabel("Program text", { exact: true })
    .fill("# Lower body\nHip thrust | 2 x 8-12 | 90s");
  await page.getByRole("button", { name: "Review imported program" }).click();
  await page
    .getByLabel("Program name", { exact: true })
    .fill("My own prep plan");
  await page.getByRole("button", { name: "Save program", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "My own prep plan", exact: true }),
  ).toBeVisible();
}
test("import, log, resume, finish, and review a private workout", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await setup(page);
  await importPlan(page);
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await page
    .getByRole("button", { name: "Start workout", exact: true })
    .click();
  await page.context().setOffline(true);
  await page.getByLabel("Hip thrust set 1 weight", { exact: true }).fill("80");
  await page.getByLabel("Hip thrust set 1 reps", { exact: true }).fill("10");
  await page
    .getByRole("button", { name: "Complete Hip thrust set 1", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Undo Hip thrust set 1", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Saved on this device · sample account", { exact: true }),
  ).toBeVisible();
  await page.context().setOffline(false);
  await page.reload();
  await nav(page);
  await expect(
    page.getByRole("button", { name: "Undo Hip thrust set 1", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/training-gym-${info.project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Finish workout", exact: true })
    .click();
  await page.getByRole("button", { name: "Progress", exact: true }).click();
  await page.locator(".training-history-entry summary").click();
  await expect(page.getByText("80 lb × 10", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Coach", exact: true }).click();
  await page.getByRole("button", { name: "Prepare check-in" }).click();
  await expect(page.getByLabel("Review your summary")).toContainText(
    "80 lb × 10",
  );
  await page
    .getByRole("button", { name: "Privacy settings", exact: true })
    .click();
  await page.getByLabel("Sample identity").selectOption({ label: "Kamilla" });
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Program", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "My own prep plan", exact: true }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("manual programs, optional prep, and unavailable AI are usable and honest", async ({
  page,
}, info) => {
  await setup(page);
  await page.screenshot({
    path: `test-results/training-home-${info.project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Build a program", exact: true })
    .click();
  await page
    .getByLabel("Program name", { exact: true })
    .fill("Off-season strength");
  await page.getByLabel("Exercise 1 name").fill("Goblet squat");
  await page.getByRole("button", { name: "Save program", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Off-season strength", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Prep", exact: true }).click();
  await page.getByLabel("Enable Prep Mode").check();
  await page.getByLabel("Division", { exact: true }).fill("Wellness");
  await page.getByRole("button", { name: "Save prep details" }).click();
  await expect(page.getByText("Prep details saved privately.")).toBeVisible();
  await page.getByRole("button", { name: "Program", exact: true }).click();
  await page
    .getByRole("button", { name: "Create with AI", exact: false })
    .click();
  await page.getByLabel("Goal", { exact: true }).fill("Build muscle");
  await page.getByLabel("Available equipment").fill("Dumbbells");
  await page.getByRole("button", { name: "Generate a draft" }).click();
  await expect(page.locator(".training-space [role=alert]")).toContainText(
    "connected account",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});
test("invalid imports never silently create a partial program", async ({
  page,
}) => {
  await setup(page);
  await page.getByRole("button", { name: "Program", exact: true }).click();
  await page
    .getByRole("button", { name: "Add my program", exact: false })
    .click();
  await page
    .getByLabel("Program text", { exact: true })
    .fill("# Legs\nSquat | 3 x 8\nUnrecognized instruction");
  await page.getByRole("button", { name: "Review imported program" }).click();
  await expect(page.locator(".training-space [role=alert]")).toContainText(
    "Nothing was skipped",
  );
  await expect(
    page.getByRole("button", { name: "Save program", exact: true }),
  ).toHaveCount(0);
});
