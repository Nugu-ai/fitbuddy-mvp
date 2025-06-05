// src/components/Ranking.js
import React, { useState, useEffect } from "react";
import axios from "axios";

// ---------------------------------------
// Google Apps Script 웹앱 URL
// (반드시 실제로 배포된 URL로 바꿔주세요)
// ---------------------------------------
const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbwS5isKVX48cuAkafURvGgLDh2AIpZhHWTBxob_mHVsKQ14f53BwE4jCOGjg6_8VGjBfA/exec";

// ---------------------------------------
// JSONP 혹은 순수 JSON 형태의 응답을
// { success: boolean, successs: boolean, data: any } 형태로 리턴합니다.
// ---------------------------------------
function parseJsonpResponse(txt) {
    if (!txt || typeof txt !== "string") {
        return { success: false, successs: false, data: null };
    }
    const trimmed = txt.trim();
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
        const jsonCandidate = trimmed.slice(firstBrace, lastBrace + 1);
        try {
            return JSON.parse(jsonCandidate);
        } catch (e) {
            console.error(
                "parseJsonpResponse: JSON.parse 실패:",
                e,
                jsonCandidate
            );
            return { success: false, successs: false, data: null };
        }
    }
    try {
        return JSON.parse(trimmed);
    } catch (e) {
        console.error("parseJsonpResponse: 순수 JSON 파싱 실패:", e, trimmed);
        return { success: false, successs: false, data: null };
    }
}

export default function Ranking({ currentUserId }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [rankedList, setRankedList] = useState([]); // [{ userid, totalLevel, username, rank }]
    const [myRank, setMyRank] = useState(null); // { rank, userid, totalLevel, username }

    // 사용자 이름 매핑을 위한 맵
    const [usersMap, setUsersMap] = useState({}); // { [userid]: { username } }

    // 데이터를 불러와서 집계 및 정렬
    const fetchRankingData = async () => {
        setLoading(true);
        setError(null);

        try {
            //
            // 1) user_characters 시트 읽기
            //
            const resChars = await axios.get(SCRIPT_URL, {
                params: { action: "read", table: "user_characters" },
                responseType: "text",
            });
            const parsedChars = parseJsonpResponse(resChars.data);
            const charsData = Array.isArray(parsedChars.data)
                ? parsedChars.data
                : [];

            //
            // 2) users 시트 읽기 (userid → username 맵 구성)
            //
            const resUsers = await axios.get(SCRIPT_URL, {
                params: { action: "read", table: "users" },
                responseType: "text",
            });
            const parsedUsers = parseJsonpResponse(resUsers.data);
            const usersData = Array.isArray(parsedUsers.data)
                ? parsedUsers.data
                : [];

            const _usersMap = {};
            usersData.forEach((row) => {
                const uid = String(row.id).trim();
                _usersMap[uid] = {
                    username: String(row.username || "알 수 없음").trim(),
                };
            });
            setUsersMap(_usersMap);

            //
            // 3) 사용자별 레벨 합 계산
            //
            const levelSums = {};
            charsData.forEach((row) => {
                const uid = String(row.userid).trim();
                const lvl = parseInt(row.level || "0", 10);
                if (!levelSums[uid]) levelSums[uid] = 0;
                levelSums[uid] += lvl;
            });

            //
            // 4) 정렬용 배열 생성 (내림차순)
            //
            const tempArray = Object.entries(levelSums).map(([uid, sum]) => ({
                userid: uid,
                totalLevel: sum,
                username: _usersMap[uid]?.username || "알 수 없음",
            }));
            // totalLevel 기준 내림차순 정렬
            tempArray.sort((a, b) => b.totalLevel - a.totalLevel);

            //
            // 5) “동점자 같은 순위” 로직
            //
            //    - 첫 번째 사용자: rank = 1
            //    - 이후 i번째 사용자:
            //         만약 totalLevel이 이전 사용자와 같으면, 같은 rank 그대로 사용
            //         그렇지 않으면 rank = i + 1
            //
            const rankedWithTie = [];
            let prevLevel = null;
            let prevRank = 0;

            tempArray.forEach((item, index) => {
                const lvl = item.totalLevel;
                let assignedRank;
                if (index === 0) {
                    // 첫 번째는 무조건 1등
                    assignedRank = 1;
                } else {
                    // 이전와 레벨이 같으면 같은 rank, 그렇지 않으면 index+1
                    if (lvl === prevLevel) {
                        assignedRank = prevRank;
                    } else {
                        assignedRank = index + 1;
                    }
                }
                rankedWithTie.push({
                    ...item,
                    rank: assignedRank,
                });
                prevLevel = lvl;
                prevRank = assignedRank;
            });

            //
            // 6) 내 랭킹 찾기
            //
            const trimmedCurrentId = String(currentUserId || "").trim();
            const myEntry =
                rankedWithTie.find(
                    (entry) => String(entry.userid).trim() === trimmedCurrentId
                ) || null;

            setRankedList(rankedWithTie);
            setMyRank(myEntry);
            setLoading(false);
        } catch (e) {
            console.error("fetchRankingData 오류:", e);
            setError("랭킹 정보를 불러오는 중 오류가 발생했습니다.");
            setLoading(false);
        }
    };

    // 컴포넌트 마운트 시 및 currentUserId 변경 시 다시 불러오기
    useEffect(() => {
        fetchRankingData();
    }, [currentUserId]);

    // 로딩 중
    if (loading) {
        return (
            <div className="text-center my-5">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">로딩 중...</span>
                </div>
                <p className="mt-3">랭킹 정보를 불러오는 중입니다...</p>
            </div>
        );
    }

    // 에러 발생
    if (error) {
        return (
            <div className="alert alert-danger text-center my-5">{error}</div>
        );
    }

    // 순위 데이터가 비어있는 경우
    if (rankedList.length === 0) {
        return (
            <div className="text-center my-5">
                <p>아직 아무도 참여하지 않았습니다.</p>
            </div>
        );
    }

    // 상위 3명 (존재하지 않을 수도 있음)
    const topThree = rankedList.filter((item) => item.rank <= 3);

    return (
        <div className="container py-4">
            {/* 내 순위 */}
            {myRank ? (
                <div className="mb-4 p-3 border rounded bg-light">
                    <h5 className="mb-2">내 순위</h5>
                    <div className="d-flex align-items-center">
                        <span className="fw-bold me-2">#{myRank.rank}</span>
                        <div className="me-3">
                            <i
                                className="bi bi-person-circle"
                                style={{ fontSize: "2rem" }}
                            />
                        </div>
                        <div>
                            <div className="fw-bold">{myRank.username}</div>
                            <small>근육 레벨 합: {myRank.totalLevel}</small>
                        </div>
                        <button
                            className="btn btn-sm btn-outline-secondary ms-auto"
                            onClick={fetchRankingData}
                        >
                            <i className="bi bi-arrow-clockwise"></i>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="mb-4 p-3 border rounded bg-warning text-center">
                    <p>로그인한 사용자의 랭킹을 찾을 수 없습니다.</p>
                </div>
            )}

            {/* 명예의 전당 헤더 */}
            <h3 className="text-center mb-3">전체 랭킹</h3>

            {/* 상위 3명: 명예의 전당 (rank 1~3을 모두 표시) */}
            <div className="row gx-3 mb-4">
                {topThree.map((entry) => {
                    const rank = entry.rank;
                    let bgClass = "";
                    if (rank === 1) bgClass = "bg-warning"; // 금색
                    else if (rank === 2) bgClass = "bg-secondary"; // 은색
                    else if (rank === 3) bgClass = "bg-danger"; // 동색

                    return (
                        <div key={entry.userid} className="col-12 mb-3">
                            <div
                                className={`d-flex align-items-center p-3 rounded ${bgClass} text-white`}
                            >
                                <span className="fw-bold me-3">#{rank}</span>
                                <div className="me-3">
                                    <i
                                        className="bi bi-person-circle"
                                        style={{ fontSize: "2rem" }}
                                    />
                                </div>
                                <div>
                                    <div className="fw-bold">
                                        {entry.username}
                                    </div>
                                    <small>
                                        근육 레벨 합: {entry.totalLevel}
                                    </small>
                                </div>
                                <button
                                    className="btn btn-sm btn-light ms-auto"
                                    onClick={fetchRankingData}
                                >
                                    <i className="bi bi-arrow-clockwise text-dark"></i>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 그 외 랭킹 (4위부터, 또는 rank > 3인 사용자) */}
            <div className="list-group">
                {rankedList
                    .filter((entry) => entry.rank > 3)
                    .map((entry) => {
                        return (
                            <div
                                key={entry.userid}
                                className="list-group-item d-flex align-items-center"
                            >
                                <span className="fw-bold me-3">
                                    #{entry.rank}
                                </span>
                                <div className="me-3">
                                    <i
                                        className="bi bi-person-circle"
                                        style={{ fontSize: "1.5rem" }}
                                    />
                                </div>
                                <div>
                                    <div>{entry.username}</div>
                                    <small className="text-muted">
                                        근육 레벨 합: {entry.totalLevel}
                                    </small>
                                </div>
                            </div>
                        );
                    })}
            </div>
        </div>
    );
}
