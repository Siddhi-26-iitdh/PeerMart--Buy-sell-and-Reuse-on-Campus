import { expect, test } from "@playwright/test";

test("home page renders Recent Listings and AI search works", async ({ page }) => {
  await page.goto("/");
  const recentSection = page.locator("#recent-listings");
  await expect(recentSection).toBeVisible();
  await expect(recentSection.getByRole("heading", { name: "Recent Listings" })).toBeVisible();
  await expect(recentSection.locator(".product-card").first()).toBeVisible();

  await page.goto("/ai-search");
  const input = page.getByLabel("Search with AI");
  await input.fill("used textbooks under 1000");
  await page.getByRole("button", { name: /Search with AI/i }).click();
  await expect(page.locator(".ai-interpret")).toBeVisible();
});

test("multi-user negotiation workflow and accepted offer -> mock payment -> PDF receipt download", async ({ browser }) => {
  const password = process.env.E2E_STUDENT_PASSWORD || process.env.PEERMART_DEMO_PASSWORD || "";
  test.skip(!password, "Set PEERMART_DEMO_PASSWORD or E2E_STUDENT_PASSWORD to run authenticated multi-user E2E test");

  const sellerContext = await browser.newContext();
  const buyerContext = await browser.newContext();
  const sellerPage = await sellerContext.newPage();
  const buyerPage = await buyerContext.newPage();

  try {
    // 1. Seller logs in and creates a dedicated test listing
    await sellerPage.goto("/login");
    await sellerPage.getByPlaceholder("name@iitdh.ac.in").fill("testuser01@iitdh.ac.in");
    await sellerPage.getByPlaceholder("At least 8 characters").fill(password);
    await sellerPage.getByRole("button", { name: /Sign in/i }).click();
    await sellerPage.waitForURL((url) => !url.pathname.includes("/login"));

    // Verify dynamic initials avatar (not hardcoded SA)
    await expect(sellerPage.locator("a.avatar")).toHaveText(/TP/);

    await sellerPage.goto("/sell");
    await sellerPage.locator("select").first().selectOption({ index: 1 });
    const uniqueTitle = `E2E Graph Theory Book ${Date.now()}`;
    await sellerPage.getByPlaceholder(/Urban commuter cycle/i).fill(uniqueTitle);
    await sellerPage.getByPlaceholder(/Describe condition/i).fill("Clean M.Tech reference book for E2E test.");
    await sellerPage.getByPlaceholder("0").fill("450");
    await sellerPage.getByRole("button", { name: /Publish listing/i }).click();
    await expect(sellerPage.getByRole("heading", { name: /Your listing is live/i })).toBeVisible();

    const listingHref = await sellerPage.getByRole("link", { name: /View listing/i }).getAttribute("href");
    expect(listingHref).toBeTruthy();

    // 2. Buyer logs in independently in a separate browser context
    await buyerPage.goto("/login");
    await buyerPage.getByPlaceholder("name@iitdh.ac.in").fill("testuser02@iitdh.ac.in");
    await buyerPage.getByPlaceholder("At least 8 characters").fill(password);
    await buyerPage.getByRole("button", { name: /Sign in/i }).click();
    await buyerPage.waitForURL((url) => !url.pathname.includes("/login"));

    // Buyer opens the new listing and submits an offer
    await buyerPage.goto(listingHref!);
    await buyerPage.getByRole("button", { name: /Make Offer/i }).click();
    await buyerPage.getByLabel("Offer price").fill("400");
    await buyerPage.getByRole("button", { name: /Submit Offer/i }).click();

    // Verify seller email is displayed in the offer confirmation popup
    await expect(buyerPage.getByRole("heading", { name: /Offer Submitted/i })).toBeVisible();
    await expect(buyerPage.getByText("testuser01@iitdh.ac.in")).toBeVisible();

    // 3. Seller views Received Offers in Profile and clicks Accept
    await sellerPage.goto("/profile");
    const offerRow = sellerPage.locator("tr", { hasText: uniqueTitle });
    await expect(offerRow).toBeVisible();
    await offerRow.getByRole("button", { name: "Accept" }).click();
    await expect(sellerPage.getByText(/Accepted · Awaiting Payment/i).first()).toBeVisible();

    // 4. Buyer opens Profile -> Accepted Offers -> Proceed to Payment -> Simulate Successful Payment -> Download Receipt
    await buyerPage.goto("/profile");
    const acceptedRow = buyerPage.locator("tr", { hasText: uniqueTitle });
    await expect(acceptedRow).toBeVisible();
    await acceptedRow.getByRole("button", { name: /Proceed to Payment/i }).click();

    await expect(buyerPage.getByRole("heading", { name: /Complete Mock Payment/i })).toBeVisible();
    await buyerPage.getByRole("button", { name: /Simulate Successful Payment/i }).click();

    await expect(buyerPage.getByRole("heading", { name: /Payment Completed/i })).toBeVisible();
    const downloadPromise = buyerPage.waitForEvent("download");
    await buyerPage.getByRole("button", { name: /Download Receipt \(PDF\)/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/PM-RCPT-.*\.pdf$/);
  } finally {
    await sellerContext.close();
    await buyerContext.close();
  }
});
