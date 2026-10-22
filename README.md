# PeerMart – Buy, Sell and Reuse on Campus

## Project Overview

PeerMart is a campus-focused online marketplace that enables students to buy and sell second-hand items within their college community. Students can list items they no longer need, such as bicycles, textbooks, calculators, electronic gadgets, furniture, hostel essentials, and sports equipment. Other students can browse listings and purchase items at affordable prices.

PeerMart encourages the reuse of products and facilitates convenient peer-to-peer transactions within the campus community, making student life more affordable, convenient, and sustainable.

## Features

- **Home Page:** Browse products from different categories and explore available listings.
- **Conventional Search:** Search and filter products by category, maximum price, and condition.
- **AI-Powered Natural-Language Search:** Search for products using ordinary sentences instead of manually applying filters.
- **Category Pages:** View listings belonging to a selected category and apply filters.
- **Product Details:** View product images, title, price, condition, and description.
- **User Registration and Login:** Create an account and access features available to registered users.
- **Sell an Item:** Create product listings with a category, title, description, condition, and 2–5 images.
- **My Sell:** Manage listings under Available, Negotiating, and Sold.
- **Cart:** View available products added to the cart, remove items, and review the total price.
- **Favourites:** Save products for later and remove them from favourites.
- **Make Offer:** Contact sellers and arrange negotiations outside PeerMart.
- **My Orders:** View ongoing negotiations, completed transactions, and receipts.
- **Receipt Generation:** Generate a peer-to-peer sale receipt containing product details, final agreed price, and buyer and seller information.
- **Admin Dashboard:** Monitor registered users and product listings, warn users about reported fraudulent activity, and delete accounts when necessary.
- **Terms and Conditions:** View and download the rules and policies for buyers and sellers.

## AI-Powered Natural-Language Product Search

PeerMart includes an AI-powered search feature that interprets natural-language queries and extracts relevant product-search criteria, such as category, price, condition, and other attributes.

For example, a user can enter:

`Find a used bicycle under 3000`

The system interprets the query and uses the extracted criteria to find matching product listings.

If the AI service fails or becomes unavailable, users can continue searching through conventional search and filters.

The feature also includes input validation, rate limiting, prompt-injection handling, API-key protection, and evaluation using predefined test queries.

## Dataset

PeerMart will use a custom dataset prepared by the project team.

- **Product categories:** 8 categories, including 7 product categories and 1 Other category.
- **Product listings:** 48 second-hand products, with at least one product from each category.
- **Product images:** Each product will have 2–5 images.
- **Fictional user accounts:** 20 accounts, comprising 19 student accounts and 1 admin account.
- **AI evaluation dataset:** 50 predefined natural-language queries covering genuine searches, prompt-injection attempts, and invalid or ambiguous inputs.
- **Privacy:** Fictional user accounts will be used for the sample dataset.

## Transaction Process

PeerMart facilitates peer-to-peer transactions between students.

1. The buyer browses products and sends an offer to the seller.
2. The buyer and seller negotiate outside PeerMart through email or in person.
3. They arrange the price, meeting, and product handover.
4. The buyer inspects the item in person and pays the seller directly in cash.
5. Once the deal is completed, the seller records the sale by selecting the buyer and entering the final agreed price.
6. The seller generates a receipt, and the sold listing is automatically removed.

## Target Users

- **Senior and graduating students:** Students who want to sell their belongings before leaving campus.
- **Junior students and new entrants:** Students looking for affordable second-hand items.
- **Current students:** Students who want to buy or sell items within their campus community.

## Team Members

- **CS26MT007** – Siddhi Avhad
- **CS26MT008** – Isha Bhardwaj
- **CS26MT013** – Radhemohan Yadav

**Project Guide:** Prof. Gayathri A.

**Course:** CS602C – Advanced Software Development Laboratory
