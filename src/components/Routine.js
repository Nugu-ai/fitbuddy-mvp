// src/components/Routine.js
import React, { useState, useEffect } from "react";

export default function Routine({ currentUserId, onExpChange }) {
    // 오늘 날짜 (KST 기준) YYYY-MM-DD 형식
    const getToday = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = d.getMonth() + 1;
        const day = d.getDate();
        return `${year}-${month < 10 ? "0" + month : month}-${
            day < 10 ? "0" + day : day
        }`;
    };
    const todayDate = getToday();

    const [selectedDate, setSelectedDate] = useState(todayDate);
    const [existingRoutines, setExistingRoutines] = useState([]);
    const [newRoutineText, setNewRoutineText] = useState("");
    const [statusMsg, setStatusMsg] = useState("");

    // localStorage 키 형식: routines-<userId>-<YYYY-MM-DD>
    const getKey = (userId, date) => `routines-${userId}-${date}`;

    // 선택된 날짜에 저장된 루틴 목록을 불러와서 state에 반영
    const loadRoutines = () => {
        if (!currentUserId) {
            setExistingRoutines([]);
            return;
        }
        const key = getKey(currentUserId, selectedDate);
        const arr = JSON.parse(localStorage.getItem(key) || "[]");
        setExistingRoutines(arr);
    };

    // selectedDate나 currentUserId가 바뀔 때마다 목록을 다시 불러옴
    useEffect(() => {
        loadRoutines();
    }, [selectedDate, currentUserId]);

    const handleDateChange = (e) => {
        setSelectedDate(e.target.value);
        setStatusMsg("");
    };

    const submitRoutine = () => {
        if (!currentUserId) {
            alert("로그인 후에 루틴을 기록할 수 있습니다.");
            return;
        }
        if (!newRoutineText.trim()) {
            alert("루틴 내용을 입력해주세요.");
            return;
        }
        // 오늘 이후 날짜 입력 막기
        if (selectedDate > todayDate) {
            alert("오늘 이후 날짜에는 루틴을 입력할 수 없습니다.");
            return;
        }

        const key = getKey(currentUserId, selectedDate);
        const arr = JSON.parse(localStorage.getItem(key) || "[]");

        if (arr.length >= 3) {
            setStatusMsg("선택한 날짜에 이미 3개의 루틴을 입력했습니다.");
            return;
        }

        // KST 기준 현재 시각을 HH:MM:SS 형태로 가져오기
        const now = new Date();
        const kstTime = now.toLocaleTimeString("ko-KR", {
            hour12: false,
            timeZone: "Asia/Seoul",
        });

        arr.push({ text: newRoutineText.trim(), time: kstTime });
        localStorage.setItem(key, JSON.stringify(arr));

        // 경험치 +10
        const expKey = `exp-${currentUserId}`;
        const currentExp = parseInt(localStorage.getItem(expKey) || "0", 10);
        const updatedExp = currentExp + 10;
        localStorage.setItem(expKey, updatedExp);
        onExpChange(updatedExp);

        setStatusMsg("루틴 기록 완료! (+10 exp)");
        setNewRoutineText("");
        loadRoutines();
    };

    return (
        <div className="text-center">
            <h2 className="fw-bold">루틴 기록</h2>

            <div className="d-flex justify-content-center mb-3">
                <label htmlFor="routine-date" className="me-2">
                    날짜 선택:
                </label>
                <input
                    id="routine-date"
                    type="date"
                    className="form-control w-auto"
                    value={selectedDate}
                    onChange={handleDateChange}
                    max={todayDate}
                />
            </div>

            <ul className="list-group w-60 mx-auto mb-3 text-start">
                {currentUserId ? (
                    existingRoutines.length > 0 ? (
                        existingRoutines.map((item, idx) => (
                            <li key={idx} className="list-group-item">
                                {idx + 1}회차
                                {/* 개행을 살리기 위해 아래처럼 wrapping */}
                                <div
                                    style={{
                                        whiteSpace: "pre-wrap",
                                        marginTop: "0.5rem",
                                    }}
                                >
                                    {item.text}
                                </div>
                            </li>
                        ))
                    ) : (
                        <li className="list-group-item">
                            해당 날짜에 기록된 루틴이 없습니다.
                        </li>
                    )
                ) : (
                    <li className="list-group-item">로그인 후 이용해주세요.</li>
                )}
            </ul>

            <textarea
                className="form-control w-60 mx-auto mb-3"
                rows="2"
                placeholder="루틴을 입력하세요"
                value={newRoutineText}
                onChange={(e) => setNewRoutineText(e.target.value)}
            />
            <button className="btn btn-success" onClick={submitRoutine}>
                기록하기
            </button>
            {statusMsg && <p className="mt-2 text-info">{statusMsg}</p>}
        </div>
    );
}
