import { test, expect } from "@playwright/test";
test("review, activate, archive and delete a knowledge document", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Open Apollo", exact: true }).click();
  await page
    .getByRole("button", { name: "Knowledge & research", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Depth that grows with you." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Add knowledge", exact: true })
    .click();
  await page
    .getByLabel("Document title", { exact: true })
    .fill("Synthetic coach program");
  await page
    .getByRole("textbox", { name: "Document content", exact: true })
    .fill("Squat: 3 sets of 10. Preserve the coach instructions.");
  await page.getByLabel("Source type").selectOption("coach_document");
  await page.getByLabel("Knowledge state").selectOption("active");
  await expect(
    page.getByRole("button", { name: "Save reviewed knowledge" }),
  ).toBeDisabled();
  await page.getByLabel("Document audience").selectOption("private");
  await page
    .getByLabel("I reviewed the wording, sources and audience.")
    .check();
  await page.getByRole("button", { name: "Save reviewed knowledge" }).click();
  await expect(
    page.getByText("Preview document saved for this visit only."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Revision history", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Latest 20 revisions · visible only to you",
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Archive document", exact: true })
    .click();
  await expect(page.getByLabel("Knowledge state")).toHaveValue("archived");
  await page
    .getByRole("button", { name: "Save document", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Return to draft", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Delete document", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Delete permanently", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Build a library with meaning." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Starter references", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Protein and training: evidence in context",
    }),
  ).toBeVisible();
  await page.screenshot({
    path: `../../outputs/Apollo-knowledge-${info.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("imports text locally and never simulates live research", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Apollo", exact: true }).click();
  await page
    .getByRole("button", { name: "Knowledge & research", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Import a document", exact: true })
    .click();
  await page
    .getByLabel("Choose a document")
    .setInputFiles({
      name: "coach-notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(
        "Synthetic program: leg press 3 sets of 12.\nDo not infer missing rest times.",
      ),
    });
  await page.getByRole("button", { name: "Load text for review" }).click();
  await expect(
    page.getByRole("textbox", { name: "Document content", exact: true }),
  ).toContainText("leg press 3 sets");
  await expect(page.getByLabel("Knowledge state")).toHaveValue("draft");
  await expect(page.getByLabel("Document audience")).toHaveValue("private");
  await page.getByRole("button", { name: "Cancel review" }).click();
  await page.getByRole("button", { name: "Research", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Your research question", exact: true })
    .fill("What does research say about fatigue?");
  await expect(
    page.getByRole("button", { name: "Research with Apollo" }),
  ).toBeDisabled();
  await expect(
    page.getByText("Only the question below goes to research", {
      exact: false,
    }),
  ).toBeVisible();
});
