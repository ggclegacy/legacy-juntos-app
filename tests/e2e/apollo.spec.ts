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
  await page.getByLabel("Send my message, selected entries").check();
  await expect(
    page.getByRole("button", { name: "Ask Apollo", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Juntos context", exact: true })
    .click();
  await expect(page.getByLabel("Your starting point")).toHaveValue("");
  await expect(
    page.getByLabel("Send my message, selected entries"),
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

test("Apollo teaching, correction and forgetting in a clearly labeled preview", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Apollo", exact: true }).click();
  await page
    .getByRole("button", { name: "Memory & learning", exact: true })
    .click();
  await expect(
    page.getByText("Teach me your world.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Teach Apollo", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Our campaign process");
  await page
    .getByLabel("What should Apollo learn?")
    .fill("Before designing, agree on the audience and one clear goal.");
  await page
    .getByRole("combobox", { name: "Type", exact: true })
    .selectOption("workflow");
  await page.getByLabel("Who can see this?").selectOption("shared");
  await page
    .getByRole("button", { name: "Save teaching", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Our campaign process", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Preview teaching saved", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Correct", exact: true }).click();
  await page
    .getByLabel("What should Apollo learn?")
    .fill("Agree on the audience, one goal, and the budget before designing.");
  await page
    .getByRole("button", { name: "Save correction", exact: true })
    .click();
  await expect(
    page.getByText(
      "Agree on the audience, one goal, and the budget before designing.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.screenshot({
    path: `../../outputs/Apollo-memory-${info.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Forget", exact: true }).click();
  await page
    .getByRole("button", { name: "Delete permanently", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Our campaign process", exact: true }),
  ).toHaveCount(0);
});

test("Apollo recall and learning controls explain consent without simulating AI", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Apollo", exact: true }).click();
  await page.getByText("Memory & app awareness", { exact: false }).click();
  await expect(
    page.getByLabel("Find memories by meaning when I send"),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Prepare next batch" }),
  ).toBeDisabled();
  await page
    .getByLabel("Your starting point")
    .fill("I prefer evening workouts.");
  await page
    .getByRole("button", { name: "Teach Apollo from this message" })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Your words", exact: true }),
  ).toHaveValue("I prefer evening workouts.");
  await expect(
    page.getByRole("button", { name: "Suggest what to remember" }),
  ).toBeDisabled();
  await expect(page.getByLabel("Who can see this?")).toHaveValue("private");
  await page.screenshot({
    path: `../../outputs/Apollo-learning-${info.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});
