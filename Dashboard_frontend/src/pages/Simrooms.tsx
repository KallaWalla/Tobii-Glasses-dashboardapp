import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { SimRoom } from "../types/simrooms"
import { Recording } from "../types/recording"
import SimRoomsComponent from "../components/SimroomsComponent"
import { SimroomsAPI } from "../api/simroomsApi"
import { RecordingsAPI } from "../api/recordingsApi"
import { LabelingAPI } from "../api/labelingApi"

export default function SimRooms() {
  const navigate = useNavigate()

  const [simrooms, setSimRooms] = useState<SimRoom[]>([])
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [selectedSimRoomId, setSelectedSimRoomId] =
    useState<string | undefined>()

  // ✅ LOAD DATA
  const fetchSimRooms = async (selectedId?: string) => {
    const data = await SimroomsAPI.getSimrooms(selectedId)
    setSimRooms(data.simrooms)

    if (selectedId) {
      setSelectedSimRoomId(selectedId)
    }
  }


  const fetchRecordings = async () => {
    const data = await RecordingsAPI.getLocal()
    setRecordings(data)
  }

  useEffect(() => {
    fetchSimRooms()
    fetchRecordings()
  }, [])

  // ✅ HANDLERS (NOW BACKEND-DRIVEN)

  const onAddSimRoom = async (name: string) => {
    await SimroomsAPI.addSimroom(name)
    await fetchSimRooms()
  }

  const onDeleteSimRoom = async (id: string) => {
    await SimroomsAPI.deleteSimroom(id)
    await fetchSimRooms()
  }

  const onSelectSimRoom = async (id: string) => {
    await fetchSimRooms(id)
  }


  const onAddCalibrationRecording = async (
    simRoomId: string,
    recordingId: string
  ) => {
    await SimroomsAPI.addCalibrationRecording(simRoomId, recordingId)
    await fetchSimRooms(simRoomId)
  }

  const onDeleteCalibrationRecording = async (
    simRoomId: string,
    calibrationId: string
  ) => {
    await SimroomsAPI.deleteCalibrationRecording(
      simRoomId,
      calibrationId
    )
    await fetchSimRooms(simRoomId)
  }

  // 🚀 CRITICAL: start labeling flow
  const onStartLabeling = async (calibrationId: string) => {
    await LabelingAPI.startLabeling(calibrationId)
    navigate("/labeling")
  }

  return (
    <SimRoomsComponent
      simrooms={simrooms}
      recordings={recordings}
      selectedSimRoomId={selectedSimRoomId}
      onAddSimRoom={onAddSimRoom}
      onDeleteSimRoom={onDeleteSimRoom}
      onSelectSimRoom={onSelectSimRoom}
      onAddCalibrationRecording={onAddCalibrationRecording}
      onDeleteCalibrationRecording={onDeleteCalibrationRecording}
      onStartLabeling={onStartLabeling}
    />
  )
}