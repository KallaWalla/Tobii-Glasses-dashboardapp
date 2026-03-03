import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { CalibrationRecording, SimRoom, SimRoomClass } from "../types/simrooms"
import { Recording } from "../types/recording"
import SimRoomsComponent from "../components/SimroomsComponent"
import { RecordingsAPI } from "../api/recordingsApi"
import { LabelingAPI } from "../api/labelingApi"
import { CalibrationAPI } from "../api/calibrationsApi"
import { ClassesAPI } from "../api/classesApi"

export default function SimRooms() {
  const navigate = useNavigate()
  const [loadingLabeling, setLoadingLabeling] = useState(false)
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [classes, setClasses] = useState<SimRoomClass[]>([])
  const [calibrationRec, setCalibrationRec] = useState<CalibrationRecording[]>([])



  const fetchRecordings = async () => {
    const data = await RecordingsAPI.getLocal()
    setRecordings(data)
  }
  const fetchClasses = async () => {
    const data = await ClassesAPI.getClasses()
    setClasses(data)
  }
  const fetchCalibrationRec = async () => {
    const data = await CalibrationAPI.getCalibrationRecordings()
    setCalibrationRec(data)
  }


  useEffect(() => {
    fetchCalibrationRec()
    fetchRecordings()
    fetchClasses()
  }, [])

  const onAddClass= async (
    newClassName: string
  ) => {
  await ClassesAPI.addClass(newClassName.trim())
  await fetchClasses()
  }
  const onDeleteClass = async (
    classId: number
  ) => {
  await ClassesAPI.deleteClass(classId)
  await fetchClasses()
  }



  const onAddCalibrationRecording = async (
    recordingId: string
  ) => {
    await CalibrationAPI.addCalibrationRecording(recordingId)
    await fetchCalibrationRec()

  }
  const handleAnnotationsChanged = async () => {
    await fetchCalibrationRec(); 
  };
  const onDeleteCalibrationRecording = async (
    calibrationId: string
  ) => {
    await CalibrationAPI.deleteCalibrationRecording(calibrationId)
    await fetchCalibrationRec()

  }

  const onStartLabeling = async (calibrationId: string) => {
    try {
      setLoadingLabeling(true) 
      await LabelingAPI.startLabeling(calibrationId)
      navigate(`/labeling/${calibrationId}`, { replace: true,})
    } catch (err) {
      console.error("Failed to start labeling:", err)
    } finally {
      setLoadingLabeling(false) 
    }
  }

  return (
    <SimRoomsComponent
      calibrationRec={calibrationRec}
      classes={classes}
      recordings={recordings}
      onAddClass={onAddClass}
      onDeleteClass={onDeleteClass}
      onAddCalibrationRecording={onAddCalibrationRecording}
      onDeleteCalibrationRecording={onDeleteCalibrationRecording}
      onStartLabeling={onStartLabeling}
      handleAnnotationsChanged={handleAnnotationsChanged}
    />
  )
}