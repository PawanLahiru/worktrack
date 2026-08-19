WorkTrack

A personal work-hour, salary, expense, and weekly compliance tracking web application built with React, Vite, and Firebase.

WorkTrack was developed to help track daily working hours, monitor weekly work limits, estimate salary, record expenses, and provide a clear overview of personal work and financial activity.

Live Demo

View Live Application

Overview

WorkTrack is a responsive web application designed for personal work-hour management.

The application provides tools for recording work shifts, calculating working time, monitoring weekly limits, estimating salary, tracking expenses, and reviewing work-related information in one place.

The project was built as a practical solution for managing part-time working hours while keeping weekly work limits easy to understand.

Main Features

* Clock-in and clock-out tracking
* Manual work-entry creation
* Work-entry editing
* Work-entry deletion
* Daily working-hour calculation
* Weekly work-hour monitoring
* 28-hour weekly compliance tracking
* Remaining available work-time calculation
* Salary estimation
* Transportation allowance calculation
* Expense tracking
* Expense categorization
* Monthly financial overview
* Work-history display
* Firebase Authentication
* Firestore database integration
* Persistent user data
* Responsive design
* Progressive Web App support
* Mobile-friendly interface
* Installable web application

Technologies Used

Frontend

* React
* JavaScript
* Vite
* CSS

Backend and Cloud Services

* Firebase Authentication
* Cloud Firestore
* Firebase Hosting

PWA

* Vite PWA
* Service Worker
* Web App Manifest
* Mobile installation support

Development Tools

* Git
* GitHub
* npm
* Visual Studio Code

Main Application Areas

Work Tracking

The Work section allows users to manage daily work records.

Main functionality includes:

* Clock-in time
* Clock-out time
* Break duration
* Total working time
* Manual work entries
* Editing existing records
* Deleting records
* Work notes
* Daily work summaries

Weekly Work-Limit Monitoring

One of the key features of WorkTrack is weekly work-hour monitoring.

The application calculates work duration using minutes rather than decimal hours to reduce rounding errors.

For a 28-hour weekly limit:
```
28 hours = 1,680 minutes
```
The application can calculate:

* Worked time
* Remaining available time
* Weekly totals
* Daily contributions to the weekly total
* Available working time for upcoming days
* Warning states when approaching the weekly limit

This makes it easier to understand how much additional work time is available.

Salary Tracking

The salary section estimates earnings based on recorded work shifts.

The calculation can include:

* Hourly wage
* Total worked time
* Number of worked days
* Transportation allowance
* Estimated monthly salary
* Per-shift estimated salary

Expense Tracking

Users can record personal expenses and compare them with estimated income.

Expense information includes:

* Amount
* Date
* Category
* Notes

Example categories include:

* Food
* Transport
* Shopping
* Bills
* Rent
* Other

The application can also summarize expenses by category.

Financial Overview

The application combines estimated salary and recorded expenses to provide a simple monthly financial overview.

This includes:

* Estimated income
* Total expenses
* Remaining balance
* Recent expenses
* Expense category totals

Authentication

Firebase Authentication is used to manage access to the application.

User-specific information can be stored using Firebase services.

Database

Cloud Firestore is used for persistent application data.

This allows work records and related information to remain available across sessions and devices.

Progressive Web App

WorkTrack supports Progressive Web App functionality.

Users can install the application on supported devices and access it similarly to a native application.

PWA features include:

* Application icons
* Web App Manifest
* Service Worker
* Installable interface
* Mobile-friendly layout

Responsive Design

WorkTrack is designed to work across:

* Desktop
* Laptop
* Tablet
* Mobile

The interface adapts to different screen sizes while keeping important work-hour information easy to access.

Project Structure
```
src/
├── assets/
├── components/
├── pages/
│   ├── Home.jsx
│   ├── Login.jsx
│   ├── Money.jsx
│   ├── Settings.jsx
│   └── Work.jsx
├── App.css
├── App.jsx
├── firebase.js
├── index.css
└── main.jsx
```
The application separates major functionality into individual pages while keeping reusable interface elements inside the components directory.

Installation

Clone the repository:
```
git clone https://github.com/PawanLahiru/worktrack.git
```

Move into the project directory:
```
cd worktrack
```
Install dependencies:
```
npm install
```
Start the development server:
```
npm run dev
```
Production Build

Create a production build:
```
npm run build
```
The generated production files are placed in:
```
dist/
```
Firebase Deployment

The application is deployed using Firebase Hosting.

Live application:
```
https://worktrack-pavan.web.app
```
Purpose of the Project

WorkTrack demonstrates practical web-development skills including:

* React application development
* State management
* Time calculations
* Business-rule implementation
* Firebase integration
* Authentication
* Firestore database usage
* Financial calculations
* Responsive UI development
* PWA development
* Git and GitHub version control
* Production deployment

Future Improvements

Possible future improvements include:

* Advanced work-hour reports
* Monthly and yearly statistics
* Charts and data visualization
* CSV or Excel export
* PDF work reports
* Multiple workplace support
* Custom weekly work limits
* Notifications when approaching weekly limits
* Calendar integration
* Improved salary reporting
* Offline synchronization
* Additional financial analytics

Author

Pawan Lahiru

Software / Web Developer based in Kyoto, Japan.

Portfolio
```
https://pawanlahiru.github.io/Portfolio/
```
GitHub
```
https://github.com/PawanLahiru
```
