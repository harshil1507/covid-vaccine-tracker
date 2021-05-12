"use strict";
const cron = require("node-cron");
const axios = require("axios").default;
const nodemailer = require("nodemailer");
require("dotenv").config();

const baseUrl =
  "https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

cron.schedule("*/15 * * * *", () => {
  const date = new Date();
  axios
    .get(baseUrl, {
      params: {
        district_id: 770,
        date:
          date.getDate() +
          "-" +
          (parseInt(date.getMonth(), 10) + 1) +
          "-" +
          date.getFullYear(),
      },
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
        Accept: "*/*",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
      },
    })
    .then((response) => response.data)
    .then(({ centers }) => {
      let availableCenters = [];
      centers.map((center) => {
        let availableDate = [];
        center.sessions.map(
          ({
            available_capacity,
            min_age_limit,
            date,
            name: centerName,
            address: centerAddress,
            pincode: centerPincode,
            fee_type: fee,
          }) => {
            if (available_capacity > 0 && min_age_limit === 18) {
              availableDate.push(date);
            }
            if (availableDate.length > 0)
              availableCenters.push({
                centerName,
                centerAddress,
                centerPincode,
                fee,
                datesAvailable: availableDate,
              });
          }
        );
        availableDate = null;
      });

      if (availableCenters.length > 0) {
        const head = `
      <html>
        <head>
          <style>
            table {
              border: 1px solid;
              } 
            td, th{
              padding: 5px;
              border: 1px solid;
            } 
          </style>
        </head>
        `;
        const tableR = availableCenters.map(
          (center) =>
            `
          <tr>
            <td>${center.centerName}</td>
            <td>${center.centerAddress}</td>
            <td>${center.centerPincode}</td>
            <td>${center.fee}</td>
            <td>${center.datesAvailable}</td>
          </tr>
          `
        );
        const tableRows = tableR.join("");
        const text =
          head +
          "<body> <table> <thead> <tr> <th>Name</th><th>Address</th><th>Pincode</th><th>Fees</th><th>Dates available</th></tr></thead>" +
          tableRows +
          "</table></body></html>";
        const mailOptions = {
          from: "harshilmaniar.app@gmail.com",
          to: "maniarharshil1000@gmail.com",
          subject:
            "Covid vaccine update for " +
            date.getHours() +
            ":" +
            date.getMinutes(),
          html: text,
          headers: {
            priority: "high",
          },
        };

        transporter.sendMail(mailOptions, function (err, info) {
          if (err) console.log(err);
          else console.log(info);
        });
        availableCenters = null;
      } else {
        console.log(
          "No vaccine slots found for 18+ . CRON job run time ",
          date
        );
        availableCenters = null;
      }
    })
    .catch((error) => console.log(error));
});
