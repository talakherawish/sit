import { Navigate, Route, Routes } from 'react-router-dom'
import { useLangSync } from './lib/hooks'
import RenterLayout from './renter/RenterLayout'
import Home from './renter/Home'
import { SpacesList, RoomDetails, Hours, FilterRooms } from './renter/Browse'
import { Book, SlotTaken, Confirmed } from './renter/Booking'
import { SignUp, Code, Login } from './renter/Auth'
import { MyBookings, MoveBooking, Reminder } from './renter/Manage'
import { Report, MyReports, Notifications, Rate, Profile } from './renter/Feedback'
import StaffLayout from './staff/StaffLayout'
import { Today, CheckIn, SeatLog } from './staff/Desk'
import { Notices, ReportsInbox, RoomDown, BookFor } from './staff/Ops'
import { Insights, RoomSettings } from './staff/Admin'
import Drawer from './prototype/Drawer'
import Demo from './prototype/Demo'

export default function App() {
  useLangSync()
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/r/home" replace />} />
        <Route path="/r" element={<RenterLayout />}>
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<Home />} />
          <Route path="list" element={<SpacesList />} />
          <Route path="room/:id" element={<RoomDetails />} />
          <Route path="hours" element={<Hours />} />
          <Route path="filter" element={<FilterRooms />} />
          <Route path="book" element={<Book />} />
          <Route path="taken" element={<SlotTaken />} />
          <Route path="confirmed/:id" element={<Confirmed />} />
          <Route path="signup" element={<SignUp />} />
          <Route path="code" element={<Code />} />
          <Route path="login" element={<Login />} />
          <Route path="bookings" element={<MyBookings />} />
          <Route path="bookings/:id/move" element={<MoveBooking />} />
          <Route path="reminder/:id" element={<Reminder />} />
          <Route path="report" element={<Report />} />
          <Route path="reports" element={<MyReports />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="rate" element={<Rate />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        <Route path="/s" element={<StaffLayout />}>
          <Route index element={<Navigate to="today" replace />} />
          <Route path="today" element={<Today />} />
          <Route path="checkin" element={<CheckIn />} />
          <Route path="seat-log" element={<SeatLog />} />
          <Route path="notices" element={<Notices />} />
          <Route path="reports" element={<ReportsInbox />} />
          <Route path="room-down" element={<RoomDown />} />
          <Route path="book-for" element={<BookFor />} />
          <Route path="insights" element={<Insights />} />
          <Route path="settings/rooms" element={<RoomSettings />} />
        </Route>
        <Route path="/demo" element={<Demo />} />
        <Route path="*" element={<Navigate to="/r/home" replace />} />
      </Routes>
      <Drawer />
    </>
  )
}
