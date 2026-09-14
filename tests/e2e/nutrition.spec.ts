import { test, expect } from "@playwright/test";
test("macro targets, weighed meal, planned food, recipe snapshots and identity privacy", async ({
  page,
}, info) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  const menu = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  async function open() {
    if (info.project.name === "mobile") {
      await expect(menu).toBeVisible();
      await menu.click();
    }
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("button", { name: "Macros", exact: true })
      .click();
  }
  await open();
  await page.getByRole("button", { name: "Set targets", exact: true }).click();
  for (const d of ["training", "rest"])
    for (const [k, v] of Object.entries({
      kcal: 2000,
      protein: 150,
      carbs: 200,
      fat: 60,
    }))
      await page.locator(`[name="${d}-${k}"]`).fill(String(v));
  await page.getByRole("button", { name: "Save targets", exact: true }).click();
  await expect(
    page.getByText("My coach · effective", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Log food", exact: true }).click();
  await page.getByLabel("Meal name", { exact: true }).fill("Test prep lunch");
  await page
    .getByRole("button", { name: "Enter a custom food", exact: true })
    .click();
  await page.getByLabel("Food name", { exact: true }).fill("Test rice");
  await page.getByLabel("Preparation / raw or cooked").fill("Cooked");
  await page.getByLabel("Calories (kcal)", { exact: true }).fill("130");
  await page.getByLabel("Protein (g)", { exact: true }).fill("2,7");
  await page.getByLabel("Carbs (g)", { exact: true }).fill("28");
  await page.getByLabel("Fat (g)", { exact: true }).fill("0,3");
  await page.getByLabel("I verified the values").check();
  await page
    .getByRole("button", { name: "Use this food", exact: true })
    .click();
  await page.getByLabel("Test rice grams", { exact: true }).fill("150");
  await page.getByLabel("Test rice amount source").selectOption("weighed");
  await page.getByLabel("Log as").selectOption("planned");
  await page
    .getByRole("button", { name: "Save planned meal", exact: true })
    .click();
  await expect(page.locator(".metric-kcal strong")).toContainText("0");
  await page.getByRole("button", { name: "Mark eaten", exact: true }).click();
  await expect(page.locator(".metric-kcal strong")).toContainText("195");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Test rice grams", { exact: true }).fill("0");
  await page.getByRole("button", { name: "Log meal", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
  await expect(page.getByLabel("Meal name", { exact: true })).toHaveValue(
    "Test prep lunch",
  );
  await page.getByLabel("Test rice grams", { exact: true }).fill("200");
  await page.getByRole("button", { name: "Log meal", exact: true }).click();
  await expect(page.locator(".metric-kcal strong")).toContainText("260");
  const nav = page.getByRole("navigation", { name: "Nutrition sections" });
  await nav.getByRole("button", { name: "Kitchen", exact: true }).click();
  await page
    .getByRole("button", { name: "Create recipe", exact: true })
    .click();
  await page.getByLabel("Recipe name").fill("Test batch");
  await page.getByLabel("Finished batch weight (g)").fill("200");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Test rice manual/ })
    .click();
  await page.getByRole("button", { name: "Save recipe", exact: true }).click();
  await page
    .getByRole("button", { name: "Log a portion", exact: true })
    .click();
  await page.getByRole("button", { name: "Log meal", exact: true }).click();
  await nav.getByRole("button", { name: "Today", exact: true }).click();
  await expect(page.locator(".metric-kcal strong")).toContainText("325");
  await page.getByLabel("Diary status").selectOption("complete");
  await page.screenshot({
    path: `../../outputs/Legacy-Juntos-Macros-${info.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  await page.reload();
  await open();
  await expect(
    page.getByRole("heading", { name: "Test prep lunch", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Privacy settings", exact: true })
    .click();
  await page.getByLabel("Sample identity").selectOption({ label: "Kamilla" });
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Test prep lunch", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".metric-kcal strong")).toContainText("0");
});
