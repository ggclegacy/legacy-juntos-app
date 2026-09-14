import { test, expect } from "@playwright/test";
test("private protocol, actual use, labs, corrections and review", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  const menu = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  if (info.project.name === "mobile") {
    await expect(menu).toBeVisible();
    await menu.click();
  }
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Protocols", exact: true })
    .click();
  await page.getByRole("button", { name: "Add protocol", exact: true }).click();
  await page.getByLabel("Product / medication name").fill("Fictional protocol");
  await page
    .getByLabel("Exact dose and route as instructed")
    .fill("Example instructions only");
  await page.getByLabel("Effective date").fill("2026-01-01");
  await page
    .getByRole("button", { name: "Save privately", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Fictional protocol" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Taken", exact: true }).click();
  await page.getByLabel("Notes / reason").fill("Synthetic use log");
  await page
    .getByRole("button", { name: "Save privately", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Fictional protocol · taken/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Enter bloodwork", exact: true })
    .click();
  await page.getByLabel("Test name").fill("Example marker");
  await page.getByLabel("Reported value").fill("4,5");
  await page.getByLabel("Units exactly").fill("mg/L");
  await page.getByLabel("Laboratory name").fill("Fictional laboratory");
  await page.getByLabel("Blood collection date").fill("2026-02-01");
  await page.getByLabel("Reference interval lower").fill("8");
  await page.getByLabel("Reference interval upper").fill("6");
  await page.getByLabel("I checked the test").check();
  await page
    .getByRole("button", { name: "Save privately", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Reference interval is reversed",
  );
  await expect(page.getByLabel("Reported value")).toHaveValue("4,5");
  await page.getByLabel("Reference interval lower").fill("1");

  await page
    .getByRole("button", { name: "Save privately", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Example marker", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /2026-02-01 · Fictional laboratory/ })
    .click();
  await expect(page.getByText("Recorded protocol at collection")).toBeVisible();
  await expect(
    page.getByRole("dialog").getByText("Fictional protocol", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Correct this result" }).click();
  await page.getByLabel("Reported value").fill("5");
  await page.getByLabel("I checked the test").check();
  await page
    .getByRole("button", { name: "Save privately", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Protocol sections" })
    .getByRole("button", { name: "Review", exact: true })
    .click();
  await page.getByRole("button", { name: "Prepare my review" }).click();
  await expect(page.getByLabel("Edit your appointment brief")).toContainText(
    "Example marker",
  );
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Protocol sections" })
    .getByRole("button", { name: "Insights", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Example marker · 5 mg/L" }),
  ).toBeVisible();
  await page.screenshot({
    path: `../../outputs/Legacy-Juntos-Protocols-${info.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  await page.reload();
  if (info.project.name === "mobile") {
    await expect(menu).toBeVisible();
    await menu.click();
  }
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Protocols", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Fictional protocol" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Privacy settings", exact: true })
    .click();
  await page.getByLabel("Sample identity").selectOption({ label: "Kamilla" });
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Fictional protocol", exact: true }),
  ).toHaveCount(0);
});
