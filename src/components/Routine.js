// src/components/Routine.js
import React, { useState, useEffect } from "react";
import axios from "axios";

// ---------------------------------------
// Google Apps Script 웹앱 URL
// (반드시 실제로 배포된 웹앱 URL을 넣어주세요)
// ---------------------------------------
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwS5isKVX48cuAkafURvGgLDh2AIpZhHWTBxob_mHVsKQ14f53BwE4jCOGjg6_8VGjBfA/exec";

// ---------------------------------------
// JSONP 래퍼("JSON_CALLBACK({...})") 와 순수 JSON 모두 파싱하는 함수
// ---------------------------------------
function parseJsonpResponse(txt) {
  if (typeof txt !== "string") {
    // axios가 이미 객체로 바꿔줬다면 그대로 반환
    return txt;
  }
  const trimmed = txt.trim();
  const firstParen = trimmed.indexOf("(");
  const lastParen = trimmed.lastIndexOf(")");
  if (firstParen !== -1 && lastParen !== -1 && lastParen > firstParen) {
    // "JSON_CALLBACK({...})" 형태라면 중간 JSON 부분만 파싱
    const jsonStr = trimmed.substring(firstParen + 1, lastParen);
    return JSON.parse(jsonStr);
  }
  // 순수 JSON이라면 그대로 파싱
  return JSON.parse(trimmed);
}

// ---------------------------------------
// 서버 “users” 시트에 protein 값을 업데이트하는 함수
// - userid: 실제 users 테이블의 id 값 (string)
// - newProtein: 업데이트할 프로틴 값 (number)
// ---------------------------------------
async function updateUserProteinOnServer(userid, newProtein) {
  if (!userid) return;
  try {
    const res = await axios.get(SCRIPT_URL, {
      params: {
        action: "update",
        table: "users",
        id: userid,
        data: JSON.stringify({ protein: newProtein }),
        callback: "JSON_CALLBACK",
      },
      responseType: "text",
    });
    console.log("[Routine] updateUserProteinOnServer(raw):", res.data);
    const parsed = parseJsonpResponse(res.data);
    if (parsed.success || parsed.successs) {
      console.log("[Routine] updateUserProteinOnServer 성공:", parsed.data);
    } else {
      console.warn(
        "[Routine] updateUserProteinOnServer 실패:",
        parsed.data.error || parsed.data
      );
    }
  } catch (err) {
    console.error("[Routine] updateUserProteinOnServer 오류:", err);
  }
}

export default function Routine({ currentUserId }) {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [existingRoutines, setExistingRoutines] = useState([]);
  const [newRoutineText, setNewRoutineText] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  // <— 새로 추가: 루틴 등록 로딩 플래그
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // localStorage 키: 유저 전체 경험치 풀 (프로틴)
  const getUserExpKey = (userId) => `userExp-${userId}`;

  // 선택된 날짜의 루틴 목록 로드 (로컬스토리지 기준)
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

  // 유저 전체 EXP 풀을 화면에 간단히 보여줄 때 사용
  const getUserExp = () => {
    if (!currentUserId) return 0;
    const key = getUserExpKey(currentUserId);
    return parseInt(localStorage.getItem(key) || "0", 10);
  };

  // 루틴 제출 핸들러
  const submitRoutine = async () => {
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

    // 1) 로딩 시작
    setIsSubmitting(true);

    try {
      // 2) 로컬스토리지에 루틴 저장
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

      // 3) 로컬스토리지에 유저 전체 경험치 풀(userExp) +10
      const userExpKey = getUserExpKey(currentUserId);
      const prevUserExp = parseInt(localStorage.getItem(userExpKey) || "0", 10);
      const nextUserExp = prevUserExp + 10;
      localStorage.setItem(userExpKey, nextUserExp);

      // 메시지 업데이트 후 목록 리로드
      setStatusMsg("루틴 기록 완료! (프로틴 +10)");
      setNewRoutineText("");
      loadRoutines();

      // 4) 서버 측 routines 테이블에도 INSERT
      const routineData = {
        id: Date.now().toString(), // 밀리초 기반 timestamp 고유 ID
        userid: currentUserId,
        date: selectedDate,
        time: kstTime,
        routine: newRoutineText.trim(),
      };

      try {
        const res = await axios.get(SCRIPT_URL, {
          params: {
            action: "insert",
            table: "routines",
            data: JSON.stringify(routineData),
            callback: "JSON_CALLBACK",
          },
          responseType: "text",
        });
        console.log("[Routine] routines 삽입 raw:", res.data);
        const parsed = parseJsonpResponse(res.data);
        if (parsed.success || parsed.successs) {
          console.log("[Routine] routines 삽입 성공:", parsed.data);
        } else {
          console.warn("[Routine] routines 삽입 실패:", parsed.data.error);
        }
      } catch (err) {
        console.error("[Routine] routines 삽입 요청 오류:", err);
      }

      // 5) 서버 users 테이블의 protein 칼럼을 “nextUserExp”로 업데이트
      await updateUserProteinOnServer(currentUserId, nextUserExp);
    } catch (err) {
      console.error("[Routine] 루틴 등록 중 오류:", err);
      alert("루틴 등록 중 오류가 발생했습니다.");
    } finally {
      // 6) 로딩 끝
      setIsSubmitting(false);
    }
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
          disabled={isSubmitting}
        />
      </div>

      {/* 유저 전체 경험치 풀 (프로틴)을 화면에 보여주고 싶다면 아래 주석 해제 */}
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
        disabled={isSubmitting}
      />
      <button
        className="btn btn-success"
        onClick={submitRoutine}
        disabled={isSubmitting}
      >
        {isSubmitting ? "등록 중…" : "기록하기"}
      </button>
      {statusMsg && <p className="mt-2 text-info">{statusMsg}</p>}

      {/* ——— 전체 화면 오버레이 + 중앙 스피너 ——— */}
      {isSubmitting && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,0.3)",
            zIndex: 9999,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div className="spinner-border text-light" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}
    </div>
  );
}
