import { Navigate, Route, Routes } from 'react-router-dom'
import { useLangSync } from './lib/hooks'
import RenterLayout from './renter/RenterLayout'
import Home from './renter/Home'
import { SpacesList, RoomDetails, Hours } from './renter/Browse'
import { Book, SlotTaken, Confirmed } from './renter/Booking'
import { SignUp, Code, Login } from './renter/Auth'
import { MyBookings, MoveBooking, Reminder } from './renter/Manage'
import StaffLayout from './staff/StaffLayout'
import { Today, CheckIn, SeatLog } from './staff/Desk'
import { Notices } from './staff/Ops'
import { RoomSettings } from './staff/Admin'
import Drawer from './prototype/Drawer'
import Demo from './prototype/Demo'

export default function App() {
  useLangSync()
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/r/home" replace />} />
        <Route path="/renter/*" element={<Navigate to="/r/home" replace />} />
        <Route path="/staff/*" element={<Navigate to="/s/today" replace />} />
        <Route path="/r" element={<RenterLayout />}>
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<Home />} />
          <Route path="list" element={<SpacesList />} />
          <Route path="room/:id" element={<RoomDetails />} />
          <Route path="hours" element={<Hours />} />
          <Route path="book" element={<Book />} />
          <Route path="taken" element={<SlotTaken />} />
          <Route path="confirmed/:id" element={<Confirmed />} />
          <Route path="signup" element={<SignUp />} />
          <Route path="code" element={<Code />} />
          <Route path="login" element={<Login />} />
          <Route path="bookings" element={<MyBookings />} />
          <Route path="bookings/:id/move" element={<MoveBooking />} />
          <Route path="reminder/:id" element={<Reminder />} />
        </Route>
        <Route path="/s" element={<StaffLayout />}>
          <Route index element={<Navigate to="today" replace />} />
          <Route path="today" element={<Today />} />
          <Route path="checkin" element={<CheckIn />} />
          <Route path="seat-log" element={<SeatLog />} />
          <Route path="notices" element={<Notices />} />
          <Route path="settings/rooms" element={<RoomSettings />} />
        </Route>
        <Route path="/demo" element={<Demo />} />
        <Route path="*" element={<Navigate to="/r/home" replace />} />
      </Routes>
      <Drawer />
    </>
  )
}
