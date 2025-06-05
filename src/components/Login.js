// src/components/Login.js
import React, { useState, useEffect } from "react";
import axios from "axios";

// ---------------------------------------
// Google Apps Script 웹앱 URL
// (반드시 실제로 배포된 웹앱 URL을 넣어주세요)
// ---------------------------------------
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyd7cpGUGtVsNQdDm3jVIV-PVcFK4vvlY4RHMGKKpsqnzZC2FrMZyTOoqNsFAGjsX5z6g/exec";

// ---------------------------------------
// 유틸 함수: 쿠키, IP, 디바이스, 타임스탬프
// ---------------------------------------
function padValue(v) {
  return v < 10 ? "0" + v : v;
}
function getTimeStamp() {
  const d = new Date();
  return `${padValue(d.getFullYear())}-${padValue(d.getMonth() + 1)}-${padValue(
    d.getDate()
  )} ${padValue(d.getHours())}:${padValue(d.getMinutes())}:${padValue(
    d.getSeconds()
  )}`;
}

function getCookieValue(name) {
  const value = "; " + document.cookie;
  const parts = value.split("; " + name + "=");
  if (parts.length === 2) return parts.pop().split(";").shift();
}
function setCookieValue(name, value, days) {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = `${name}=${value || ""}${expires}; path=/`;
}
function getUVfromCookie() {
  const hash = Math.random().toString(36).substring(2, 8).toUpperCase();
  const existing = getCookieValue("user");
  if (!existing) {
    setCookieValue("user", hash, 180);
    return hash;
  }
  return existing;
}

function getDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
    ? "mobile"
    : "desktop";
}

let ip = "unknown";
function setIP(json) {
  try {
    ip = json.ip;
  } catch {
    ip = "unknown";
  }
}
window.setIP = setIP;
function loadIP() {
  const script = document.createElement("script");
  script.src = "https://jsonip.com?format=jsonp&callback=setIP";
  document.head.appendChild(script);
}

export default function Login({ onLogin }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  // 컴포넌트 마운트 시 IP 가져오기
  useEffect(() => {
    loadIP();
  }, []);

  const handleLogin = () => {
    const trimmedName = name.trim();
    const trimmedPw = password.trim();

    if (!trimmedName || !trimmedPw) {
      alert("이름과 비밀번호를 모두 입력해주세요.");
      return;
    }

    // 1) 먼저 users 테이블 전체를 읽어온다
    axios
      .get(SCRIPT_URL, {
        params: { action: "read", table: "users" },
        responseType: "text",
      })
      .then((res) => {
        console.log("[Login] users read raw:", res.data);

        let allUsers = [];
        const txt = res.data;

        // JSONP 형태인지 순수 JSON인지 구분해서 파싱
        if (typeof txt === "string" && txt.startsWith("undefined(")) {
          const jsonStr = txt.slice("undefined(".length, -1);
          const parsed = JSON.parse(jsonStr);
          allUsers = parsed.success ? parsed.data : [];
        } else {
          const parsed = JSON.parse(txt);
          allUsers = parsed.success ? parsed.data : [];
        }

        // 2) 스프레드시트에서 온 username/password 값도 trim() 후 비교
        const found = allUsers.find((row) => {
          // row.username, row.password가 undefined일 수 있으니 조심해서 처리
          const serverName = (row.username || "").toString().trim();
          const serverPw = (row.password || "").toString().trim();
          return serverName === trimmedName && serverPw === trimmedPw;
        });

        if (found) {
          // 기존 사용자 로그인
          const serverUserId = found.id.toString();
          console.log("[Login] 기존 사용자 로그인, userId:", serverUserId);
          localStorage.setItem("currentUserId", serverUserId);
          setStatusMsg(`${trimmedName}님, 환영합니다!`);
          onLogin(serverUserId, false, trimmedName, trimmedPw);
        } else {
          // 신규 사용자 생성
          const timestampId = Date.now().toString();
          const visitorId = getUVfromCookie();
          const newUserData = {
            id: timestampId,
            visitorId: visitorId,
            username: trimmedName,
            password: trimmedPw,
            protein: 0,
          };

          console.log("[Login] 신규 삽입 payload:", newUserData);
          axios
            .get(SCRIPT_URL, {
              params: {
                action: "insert",
                table: "users",
                data: JSON.stringify(newUserData),
              },
              responseType: "text",
            })
            .then((res2) => {
              console.log("[Login] users insert raw:", res2.data);
              const txt2 = res2.data;
              if (typeof txt2 === "string" && txt2.startsWith("undefined(")) {
                const jsonStr2 = txt2.slice("undefined(".length, -1);
                const parsed2 = JSON.parse(jsonStr2);
                if (parsed2.success) {
                  console.log("[Login] users 신규 삽입 성공:", parsed2.data);

                  // 기본 캐릭터 3개도 user_characters 테이블에 추가
                  const defaultChars = [
                    "daehyunggeun",
                    "daetuaesadu",
                    "bokjikgeun",
                  ];
                  defaultChars.forEach((charId) => {
                    const charRow = {
                      id: Date.now().toString() + "_" + charId,
                      userid: timestampId,
                      charId: charId,
                      level: 1,
                    };
                    axios
                      .get(SCRIPT_URL, {
                        params: {
                          action: "insert",
                          table: "user_characters",
                          data: JSON.stringify(charRow),
                        },
                        responseType: "text",
                      })
                      .then((res3) => {
                        console.log(
                          `[Login] user_characters 기본 삽입 성공(${charId}):`,
                          res3.data
                        );
                      })
                      .catch((err3) => {
                        console.error(
                          `[Login] user_characters 기본 삽입 오류(${charId}):`,
                          err3
                        );
                      });
                  });

                  localStorage.setItem("currentUserId", timestampId);
                  setStatusMsg(`${trimmedName}님, 가입되었습니다!`);
                  onLogin(timestampId, true, trimmedName, trimmedPw);
                } else {
                  console.warn(
                    "[Login] users 신규 삽입 실패:",
                    parsed2.data.error
                  );
                  alert("신규 사용자 등록에 실패했습니다.");
                }
              } else {
                // 순수 JSON인 경우
                const parsed2 = JSON.parse(txt2);
                if (parsed2.success) {
                  console.log("[Login] users 신규 삽입 순수 JSON 성공:", parsed2.data);

                  // 기본 캐릭터 3개도 user_characters 테이블에 추가
                  const defaultChars = [
                    "daehyunggeun",
                    "daetuaesadu",
                    "bokjikgeun",
                  ];
                  defaultChars.forEach((charId) => {
                    const charRow = {
                      id: Date.now().toString() + "_" + charId,
                      userid: timestampId,
                      charId: charId,
                      level: 1,
                    };
                    axios
                      .get(SCRIPT_URL, {
                        params: {
                          action: "insert",
                          table: "user_characters",
                          data: JSON.stringify(charRow),
                        },
                        responseType: "text",
                      })
                      .then((res3) => {
                        console.log(
                          `[Login] user_characters 기본 삽입 성공(${charId}):`,
                          res3.data
                        );
                      })
                      .catch((err3) => {
                        console.error(
                          `[Login] user_characters 기본 삽입 오류(${charId}):`,
                          err3
                        );
                      });
                  });

                  localStorage.setItem("currentUserId", timestampId);
                  setStatusMsg(`${trimmedName}님, 가입되었습니다!`);
                  onLogin(timestampId, true, trimmedName, trimmedPw);
                } else {
                  console.warn(
                    "[Login] users 신규 삽입 순수 JSON 실패:",
                    parsed2.data.error
                  );
                  alert("신규 사용자 등록에 실패했습니다.");
                }
              }
            })
            .catch((err2) => {
              console.error("[Login] users 신규 삽입 요청 오류:", err2);
              alert("신규 사용자 등록 중 오류가 발생했습니다.");
            });
        }
      })
      .catch((err) => {
        console.error("[Login] users 테이블 조회 실패:", err);
        alert("로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      });
  };

  return (
    <div className="text-center">
      <h2 className="fw-bold">간단 로그인</h2>
      <input
        type="text"
        className="form-control w-50 mx-auto mb-2"
        placeholder="이름"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="password"
        className="form-control w-50 mx-auto mb-3"
        placeholder="비밀번호"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button className="btn btn-primary" onClick={handleLogin}>
        로그인 / 신규 사용자 등록
      </button>
      {statusMsg && <p className="mt-2 text-success">{statusMsg}</p>}
    </div>
  );
}
