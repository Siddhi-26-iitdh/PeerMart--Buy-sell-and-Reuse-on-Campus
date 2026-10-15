# PeerMart — Buy, Sell and Reuse on Campus

PeerMart is a campus-focused online marketplace that enables students to buy and sell second-hand items within their college community. It aims to make student life more affordable and encourage product reuse.

## Project Overview

- Students can list items such as bicycles, textbooks, calculators, electronic gadgets, furniture, hostel essentials, and sports equipment.
- Buyers can browse available products and connect with sellers to coordinate transactions.
- The platform is designed to support product listings, search and filtering, and AI-powered natural-language search.

## Target Users

- Senior and graduating students who want to sell items before leaving campus.
- Junior students and new entrants looking for affordable second-hand items.
- Current students who want to buy, sell, or exchange items within the campus community.
- Student buyers and sellers who want to discover products and compare prices.

## Planned Features

- Home page with product categories and featured or recently added products.
- Browse categories and view products in a selected category.
- Product search and filtering by keyword, category, price, condition, and availability.
- AI-powered natural-language product search.
- User registration and login.
- Product details with images, price, description, category, and seller information.
- Seller dashboard to manage product listings.
- Add, edit, delete, and update availability of product listings.
- Favourites and cart.
- Checkout and order placement.
- Order confirmation, order status, and My Orders page.
- Seller order and sales management.

## AI-Powered Natural-Language Search

- Planned use of the Google Gemini API to interpret natural-language search queries.
- Extract search criteria such as product category, price, and condition.
- Validate the extracted criteria in the backend before searching the MySQL database.
- Provide conventional keyword search and filters if the AI service fails.
- Evaluate the feature using a predefined set of natural-language queries.

## Dataset

- Custom-generated synthetic dataset created locally using Python and the Faker library.
- No real student personal information will be used.
- Planned data components:
  - Users
  - Categories
  - Products
  - Orders
  - Order Items
  - AI Evaluation Set
- Generated data will be exported as CSV files and imported into MySQL.
- A fixed random seed will be used to make sample data generation reproducible.

## Planned Technology Stack

- **Backend:** Python with FastAPI or Flask
- **Database:** MySQL 8
- **API:** OpenAPI 3.x
- **Frontend:** HTML, CSS, and JavaScript
- **AI service:** Google Gemini API
- **Testing:** pytest and pytest-cov; Playwright for end-to-end tests
- **Continuous integration:** GitHub Actions
- **Containerisation:** Docker and Docker Compose

## Team Members

- **CS26MT007** — Siddhi Avhad
- **CS26MT008** — Isha Bhardwaj
- **CS26MT013** — Radhemohan Yadav

## Project Information

- **Project:** PeerMart — Buy, Sell and Reuse on Campus
- **Course:** CS602C — Advanced Software Development Laboratory
- **Guide:** Prof. Gayathri A.

---

