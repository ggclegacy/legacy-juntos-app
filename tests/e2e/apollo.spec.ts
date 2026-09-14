import { test, expect } from "@playwright/test";
test("Apollo identity controls and private/shared clearing", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Open Apollo", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Apollo", exact: true }),
  ).toBeVisible();
  await page.getByLabel("How can Apollo help?").selectOption("fitness");
  await page.getByText("Make this conversation yours", { exact: true }).click();
  await page.getByLabel("Response language").selectOption("pt-BR");
  await page.getByLabel("Coaching tone").selectOption("direct");
  await page.getByLabel("What would help?").selectOption("teach");
  await page.getByLabel("Response depth").selectOption("deep");
  await page.getByText("What Apollo stands for", { exact: true }).click();
  await expect(page.getByText("Purpose.", { exact: true })).toBeVisible();
  await expect(page.getByText("Discretion.", { exact: true })).toBeVisible();
  await page.getByLabel("Your starting point").fill("Synthetic private draft");
  await page.getByLabel("Send my message and selected entries").check();
  await expect(
    page.getByRole("button", { name: "Ask Apollo", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Juntos context", exact: true })
    .click();
  await expect(page.getByLabel("Your starting point")).toHaveValue("");
  await expect(
    page.getByLabel("Send my message and selected entries"),
  ).not.toBeChecked();
  await expect(
    page.getByText("Only Juntos entries can be selected.", { exact: false }),
  ).toBeVisible();
  await page.screenshot({
    path: `../../outputs/Apollo-identity-${info.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
