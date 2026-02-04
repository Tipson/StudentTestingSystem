/**
 * Hook для управления состоянием нагрузочного тестирования
 */
import { useState, useRef, useCallback } from 'react';

export function useLoadTesting() {
    const [loadTestRunning, setLoadTestRunning] = useState(false);
    const [testResults, setTestResults] = useState([]);
    const [liveMetrics, setLiveMetrics] = useState(null);
    
    const abortControllerRef = useRef(null);

    const pushResult = useCallback((result) => {
        setTestResults(prev => [result, ...prev]);
    }, []);

    const clearResults = useCallback(() => {
        setTestResults([]);
    }, []);

    const updateLiveMetrics = useCallback((metrics) => {
        setLiveMetrics(metrics);
    }, []);

    const startLoadTest = useCallback(() => {
        setLoadTestRunning(true);
        setLiveMetrics({
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            currentRPS: 0,
            elapsedTime: 0,
        });
        abortControllerRef.current = new AbortController();
        return abortControllerRef.current.signal;
    }, []);

    const stopLoadTest = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setLoadTestRunning(false);
        setLiveMetrics(null);
    }, []);

    const endLoadTest = useCallback(() => {
        setLoadTestRunning(false);
        setLiveMetrics(null);
        abortControllerRef.current = null;
    }, []);

    return {
        loadTestRunning,
        testResults,
        liveMetrics,
        abortSignal: abortControllerRef.current?.signal,
        
        pushResult,
        clearResults,
        updateLiveMetrics,
        startLoadTest,
        stopLoadTest,
        endLoadTest,
    };
}
