import React, { useState, useEffect } from "react";

export default function Routine({ currentUserId }) {
    const [selectedDate, setSelectedDate] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [existingRoutines, setExistingRoutines] = useState([]);
    const [newRoutineText, setNewRoutineText] = useState("");
    const [statusMsg, setStatusMsg] = useState("");

    // “오늘 날짜” 계산 (YYYY-MM-DD)
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

    // localStorage 키 형식: routines-<userId>-<YYYY-MM-DD>
    const getRoutineKey = (userId, date) => `routines-${userId}-${date}`;

    // localStorage 키: 유저 전체 경험치 풀
    const getUserExpKey = (userId) => `userExp-${userId}`;

    // 선택된 날짜의 루틴 목록 로드
    const loadRoutines = () => {
        if (!currentUserId) {
            setExistingRoutines([]);
            return;
        }
        const key = getRoutineKey(currentUserId, selectedDate);
        const arr = JSON.parse(localStorage.getItem(key) || "[]");
        setExistingRoutines(arr);
    };

    // selectedDate 또는 currentUserId가 바뀔 때마다 목록을 다시 로드
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

        const key = getRoutineKey(currentUserId, selectedDate);
        const arr = JSON.parse(localStorage.getItem(key) || "[]");

        if (arr.length >= 3) {
            setStatusMsg("선택한 날짜에 이미 3개의 루틴을 입력했습니다.");
            return;
        }

        // KST 기준 HH:MM:SS 형태 시간
        const now = new Date();
        const kstTime = now.toLocaleTimeString("ko-KR", {
            hour12: false,
            timeZone: "Asia/Seoul",
        });

        arr.push({ text: newRoutineText.trim(), time: kstTime });
        localStorage.setItem(key, JSON.stringify(arr));

        // **유저 전체 경험치 풀(userExp) +10**
        const userExpKey = getUserExpKey(currentUserId);
        const prevUserExp = parseInt(
            localStorage.getItem(userExpKey) || "0",
            10
        );
        const nextUserExp = prevUserExp + 10;
        localStorage.setItem(userExpKey, nextUserExp);

        setStatusMsg("루틴 기록 완료! (exp +10)");
        setNewRoutineText("");
        loadRoutines();
    };

    // 유저 전체 EXP 풀을 화면에 간단히 보여줄 때 사용 (옵션)
    const getUserExp = () => {
        if (!currentUserId) return 0;
        const key = getUserExpKey(currentUserId);
        return parseInt(localStorage.getItem(key) || "0", 10);
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

            {/* 유저 전체 경험치 풀을 화면에 보여주고 싶다면 uncomment ↓ */}
            {/* <p className="mb-3 text-info">
        현재 유저 경험치 풀: <strong>{getUserExp()}</strong>
      </p> */}

            <ul className="list-group w-75 mx-auto mb-3 text-start">
                {currentUserId ? (
                    existingRoutines.length > 0 ? (
                        existingRoutines.map((item, idx) => (
                            <li key={idx} className="list-group-item">
                                {idx + 1}회차{" "}
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
                className="form-control w-75 mx-auto mb-3"
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
