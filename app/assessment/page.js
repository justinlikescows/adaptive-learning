"use client";

import React, { useState, useEffect, useRef } from 'react';
import * as speechsdk from 'microsoft-cognitiveservices-speech-sdk';
import KeyboardVoiceIcon from '@mui/icons-material/KeyboardVoice';
import StopIcon from '@mui/icons-material/Stop';

const PronunciationDetailsTable = ({ words }) => {
  const phthreshold1 = 80;
  const phthreshold2 = 60;
  const phthreshold3 = 40;

  const getBackgroundColor = (accuracyScore) => {
    if (accuracyScore >= phthreshold1) return "green";
    else if (accuracyScore >= phthreshold2) return "lightgreen";
    else if (accuracyScore >= phthreshold3) return "yellow";
    else return "red";
  };

  return (
    <table>
      <thead>
        <tr>
          <th>Word</th>
          <th>Phoneme</th>
          <th>Score</th>
        </tr>
      </thead>
      <tbody>
        {words.map((w, wi) => (
          <React.Fragment key={wi}>
            {w.ErrorType === "Omission" ? (
              <tr style={{ backgroundColor: "orange" }}>
                <td>{w.Word}</td>
                <td>-</td>
                <td>-</td>
              </tr>
            ) : w.ErrorType === "Insertion" ? (
              <tr style={{ backgroundColor: "orange" }}>
                <td>{w.Word}</td>
                <td>Inserted</td>
                <td>-</td>
              </tr>
            ) : (
              w.Phonemes.map((p, pi) => (
                <tr key={pi} style={{ backgroundColor: getBackgroundColor(p.AccuracyScore) }}>
                  {pi === 0 && <td rowSpan={w.Phonemes.length}>{w.Word}</td>}
                  <td>{p.Phoneme}</td>
                  <td>{p.AccuracyScore}</td>
                </tr>
              ))
            )}
          </React.Fragment>
        ))}
      </tbody>
    </table>
  );
};

const PronunciationAssessment = () => {
  const [recognitionResult, setRecognitionResult] = useState(null);
  const [isAssessmentComplete, setIsAssessmentComplete] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recognizer, setRecognizer] = useState(null);
  const [userText, setUserText] = useState('');
  const [assessmentText, setAssessmentText] = useState('');
  const textareaRef = useRef(null);

  const initializeRecognizer = () => {
    const speechConfig = speechsdk.SpeechConfig.fromSubscription(
      process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY || '',
      process.env.NEXT_PUBLIC_AZURE_SERVICE_REGION || ''
    );
    speechConfig.speechRecognitionLanguage = 'en-US';

    const audioConfig = speechsdk.AudioConfig.fromDefaultMicrophoneInput();
    const recognizer = new speechsdk.SpeechRecognizer(speechConfig, audioConfig);

    const pronunciationConfig = new speechsdk.PronunciationAssessmentConfig(
      assessmentText,
      speechsdk.PronunciationAssessmentGradingSystem.HundredMark,
      speechsdk.PronunciationAssessmentGranularity.Phoneme
    );

    pronunciationConfig.applyTo(recognizer);

    recognizer.recognized = (s, e) => {
      if (e.result.reason === speechsdk.ResultReason.RecognizedSpeech) {
        const jsonResult = JSON.parse(e.result.properties.getProperty(speechsdk.PropertyId.SpeechServiceResponse_JsonResult));
        setRecognitionResult(jsonResult.NBest[0].PronunciationAssessment);
      } else {
        console.error('Recognition failed:', e.result);
      }
      setIsAssessmentComplete(true);
    };

    setRecognizer(recognizer);
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognizer?.stopContinuousRecognitionAsync(() => {
        setIsRecording(false);
      }, (err) => {
        console.error("Error stopping continuous recognition:", err);
        setIsRecording(false);
      });
    } else {
      setIsAssessmentComplete(false);
      recognizer?.startContinuousRecognitionAsync(() => {
        setIsRecording(true);
      }, (err) => {
        console.error("Error starting continuous recognition:", err);
        setIsRecording(false);
      });
    }
  };

  const handleTextChange = (e) => {
    setUserText(e.target.value);
    autoResizeTextarea();
  };

  const handleAssessmentStart = () => {
    setAssessmentText(userText);
  };

  const autoResizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  };

  useEffect(() => {
    if (assessmentText) {
      initializeRecognizer();
    }
  }, [assessmentText]);

  useEffect(() => {
    autoResizeTextarea();
  }, [userText]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-6 rounded-lg shadow-md text-center w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">Pronunciation Assessment</h1>
        <div className="relative mb-4">
          <textarea
            ref={textareaRef}
            value={userText}
            onChange={handleTextChange}
            placeholder="Enter text for assessment"
            className="border rounded p-2 w-full resize-none overflow-hidden"
            style={{ paddingBottom: '2.5rem' }}
            rows={3}
          />
          <div className="pd-2.5">
            <button
              onClick={handleAssessmentStart}
              className="absolute right-1 bottom-2 bg-green-500 text-white py-1 px-2 rounded hover:bg-green-700 transition duration-300 text-sm"
            >
              Set
            </button>
          </div>
        </div>
        <button
          onClick={toggleRecording}
          className={`bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-700 transition duration-300 ${isRecording ? 'bg-red-500 hover:bg-red-700' : ''}`}
        >
          {isRecording ? <StopIcon /> : <KeyboardVoiceIcon />}
        </button>

        {isAssessmentComplete && recognitionResult && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-2">Results:</h2>
            <p className="text-gray-700">Accuracy score: {recognitionResult.AccuracyScore}</p>
            <p className="text-gray-700">Fluency score: {recognitionResult.FluencyScore}</p>
            <p className="text-gray-700">Completeness score: {recognitionResult.CompletenessScore}</p>
            <p className="text-gray-700">Pronunciation score: {recognitionResult.PronScore}</p>
            {recognitionResult.Words && <PronunciationDetailsTable words={recognitionResult.Words} />}
          </div>
        )}
      </div>
    </div>
  );
};

export default PronunciationAssessment;