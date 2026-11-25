# Public booking (#18)

Signed out for steps 1 to 3, then the local admin login. Saves one booking.

1. **Slots load:** on `/`, go to the booking section and pick a date. You should see the free time slots.
2. **Book:** pick a slot, and book as `zz-test-booking` with a made-up email address. You should see the confirmation.
3. **The slot is taken:** reload and pick the same date. The slot you booked should be gone.
4. **Cancel it:** signed in, on `/admin/bookings`, cancel the `zz-test-booking` booking. The slot should be free again.

- **Must not happen:** a booking saved with the form left half empty; the same slot booked twice.
- **Records:** the `zz-test-booking` booking, cancelled in step 4. Without the Turnstile and Google Calendar keys in `.env.local`, the captcha is skipped and no calendar event is made.
