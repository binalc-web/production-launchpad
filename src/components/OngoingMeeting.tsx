import React, { useState, useEffect } from 'react';
import { 
  Video, VideoOff, Mic, MicOff, MonitorSpeaker, MoreHorizontal, 
  Phone, Volume2, Users, MessageCircle, ExternalLink, ArrowLeft,
  Circle, Clock, UserCheck, Settings, Share, Maximize, Send,
  Minimize, PhoneOff, RadioIcon, Dot, ScreenShare, Monitor,
  Square, VolumeX, Volume1, Play
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { Slider } from './ui/slider';
import { toast } from "sonner@2.0.3";
import exampleImage from 'figma:asset/dce4a700f0625051d14953ee14e83167eba4a666.png';

interface User {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar: string;
}

interface UserPermissions {
  canCreateMeetings: boolean;
  canAccessAllMeetings: boolean;
  canCreateJiraTickets: boolean;
  canCreateConfluenceDocs: boolean;
  canManageIntegrations: boolean;
  canManageUsers: boolean;
  directJiraAccess: boolean;
}

interface Participant {
  id: string;
  name: string;
  avatar: string;
  role: string;
  isHost: boolean;
  isMuted: boolean;
  isCameraOn: boolean;
  isPresent: boolean;
  joinedAt: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: string;
}

interface Meeting {
  id: string;
  title: string;
  startTime: string;
  participants: Participant[];
}

interface OngoingMeetingProps {
  meeting: Meeting;
  currentUser: User;
  userPermissions: UserPermissions;
  onBack: () => void;
  onLeaveMeeting: () => void;
}

export function OngoingMeeting({ 
  meeting, 
  currentUser, 
  userPermissions, 
  onBack, 
  onLeaveMeeting 
}: OngoingMeetingProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isRecording, setIsRecording] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [volume, setVolume] = useState([75]);
  const [chatMessage, setChatMessage] = useState('');
  const [showChat, setShowChat] = useState(true);
  const [meetingDuration, setMeetingDuration] = useState('00:08:24');
  const [activeView, setActiveView] = useState<'speaker' | 'gallery'>('speaker');

  // Mock data for participants
  const mockParticipants: Participant[] = [
    {
      id: '1',
      name: 'Anne Hathaway',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
      role: 'Host',
      isHost: true,
      isMuted: false,
      isCameraOn: true,
      isPresent: true,
      joinedAt: '10:00 AM'
    },
    {
      id: '2',
      name: 'Robert Pattinson',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      role: 'Product Manager',
      isHost: false,
      isMuted: true,
      isCameraOn: true,
      isPresent: true,
      joinedAt: '10:02 AM'
    },
    {
      id: '3',
      name: 'Natalie Portman',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      role: 'Designer',
      isHost: false,
      isMuted: false,
      isCameraOn: true,
      isPresent: true,
      joinedAt: '10:01 AM'
    },
    {
      id: '4',
      name: 'Taylor Swift',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      role: 'Developer',
      isHost: false,
      isMuted: false,
      isCameraOn: false,
      isPresent: true,
      joinedAt: '10:03 AM'
    }
  ];

  // Mock chat messages
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      senderId: '2',
      senderName: 'Robert',
      message: 'Please turn on your camera guys',
      timestamp: '10:05 AM'
    },
    {
      id: '2',
      senderId: '1',
      senderName: 'You',
      message: 'Okay delay and please don\'t forget fill the attendance form',
      timestamp: '10:06 AM'
    },
    {
      id: '3',
      senderId: '3',
      senderName: 'Natalie',
      message: 'Okay!',
      timestamp: '10:06 AM'
    }
  ]);

  // Timer effect for meeting duration
  useEffect(() => {
    const interval = setInterval(() => {
      const startTime = new Date(meeting.startTime).getTime();
      const now = new Date().getTime();
      const duration = now - startTime;
      
      const hours = Math.floor(duration / (1000 * 60 * 60));
      const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((duration % (1000 * 60)) / 1000);
      
      setMeetingDuration(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [meeting.startTime]);

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    toast.success(isMuted ? "Microphone unmuted" : "Microphone muted");
  };

  const handleToggleCamera = () => {
    setIsCameraOn(!isCameraOn);
    toast.success(isCameraOn ? "Camera turned off" : "Camera turned on");
  };

  const handleToggleRecording = () => {
    setIsRecording(!isRecording);
    toast.success(isRecording ? "Recording stopped" : "Recording started");
  };

  const handleToggleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
    toast.success(isScreenSharing ? "Screen sharing stopped" : "Screen sharing started");
  };

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        senderId: currentUser.id,
        senderName: 'You',
        message: chatMessage.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages([...chatMessages, newMessage]);
      setChatMessage('');
    }
  };

  const handleLeaveMeeting = () => {
    if (window.confirm('Are you sure you want to leave the meeting?')) {
      onLeaveMeeting();
    }
  };

  return (
    <div className="h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-white hover:bg-gray-800">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Video className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="font-medium">{meeting.title}</h1>
              <div className="flex items-center space-x-2 text-sm text-gray-300">
                <Badge variant="secondary" className="bg-blue-600 text-white text-xs px-2 py-0.5">
                  Team
                </Badge>
                <span>•</span>
                <span>Ongoing meeting</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {isRecording && (
            <div className="flex items-center space-x-2 bg-red-600 px-3 py-1 rounded-full">
              <Circle className="h-3 w-3 text-white animate-pulse fill-current" />
              <span className="text-sm text-white">Record {meetingDuration}</span>
            </div>
          )}
          <Button variant="ghost" size="sm" className="text-white hover:bg-gray-800">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Video Area */}
        <div className="flex-1 flex flex-col">
          {/* Main Video Feed */}
          <div className="flex-1 relative bg-gray-900 flex items-center justify-center">
            {/* Main Speaker View */}
            <div className="relative w-full h-full max-w-4xl mx-auto">
              <img 
                src="https://images.unsplash.com/photo-1494790108755-2616b612b786?w=800&h=600&fit=crop&crop=face"
                alt="Main speaker"
                className="w-full h-full object-cover rounded-lg"
              />
              
              {/* Recording indicator */}
              {isRecording && (
                <div className="absolute top-4 left-4 flex items-center space-x-2 bg-red-600/90 px-3 py-1 rounded-full">
                  <Circle className="w-2 h-2 text-white fill-current animate-pulse" />
                  <span className="text-white text-sm">Recording</span>
                </div>
              )}

              {/* Speaker name */}
              <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded text-white text-sm">
                Anne Hathaway (Host)
              </div>

              {/* Expand/Minimize controls */}
              <div className="absolute top-4 right-4 flex space-x-2">
                <Button variant="ghost" size="sm" className="bg-black/30 text-white hover:bg-black/50">
                  <Share className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="bg-black/30 text-white hover:bg-black/50">
                  <Maximize className="h-4 w-4" />
                </Button>
              </div>

              {/* Subtitle overlay */}
              <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 bg-black/70 px-4 py-2 rounded text-white text-sm max-w-md text-center">
                Hi! It's really nice to meet you guys after a week off
              </div>
            </div>
          </div>

          {/* Participant Thumbnails */}
          <div className="bg-gray-900 p-4">
            <div className="flex space-x-3 justify-center">
              {mockParticipants.slice(1).map((participant) => (
                <div key={participant.id} className="relative">
                  <div className="w-24 h-18 bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                    {participant.isCameraOn ? (
                      <img 
                        src={participant.avatar} 
                        alt={participant.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-800">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={participant.avatar} alt={participant.name} />
                          <AvatarFallback>{participant.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      </div>
                    )}
                    
                    {/* Mute indicator */}
                    {participant.isMuted && (
                      <div className="absolute bottom-1 left-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center">
                        <MicOff className="h-3 w-3 text-white" />
                      </div>
                    )}
                    
                    {/* Active speaker indicator */}
                    {!participant.isMuted && (
                      <div className="absolute bottom-1 left-1 w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                        <Mic className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                  
                  {/* Name label */}
                  <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-white text-xs text-center whitespace-nowrap">
                    {participant.name.split(' ')[0]}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Meeting Controls */}
          <div className="bg-gray-900 px-8 py-6 border-t border-gray-700">
            <div className="flex items-center justify-center">
              {/* Volume Control Section */}
              <div className="flex items-center gap-3 mr-8">
                <Avatar className="h-10 w-10 ring-2 ring-gray-600">
                  <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                  <AvatarFallback className="bg-gray-700 text-white">{currentUser.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6">
                    {volume[0] === 0 ? (
                      <VolumeX className="h-4 w-4 text-gray-300" />
                    ) : volume[0] < 50 ? (
                      <Volume1 className="h-4 w-4 text-gray-300" />
                    ) : (
                      <Volume2 className="h-4 w-4 text-gray-300" />
                    )}
                  </div>
                  <div className="w-20">
                    <Slider
                      value={volume}
                      onValueChange={setVolume}
                      max={100}
                      step={1}
                      className="cursor-pointer"
                      title={`Volume: ${volume[0]}%`}
                    />
                  </div>
                  <span className="text-xs text-gray-300 w-10 text-right font-medium">{volume[0]}%</span>
                </div>
              </div>

              {/* Main Control Buttons */}
              <div className="flex items-center gap-3">
                {/* Recording */}
                <Button
                  variant={isRecording ? "default" : "ghost"}
                  size="lg"
                  onClick={handleToggleRecording}
                  className={`rounded-full w-14 h-14 relative transition-all duration-300 ease-out ${
                    isRecording 
                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/40 scale-105' 
                      : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 hover:scale-105 shadow-lg hover:shadow-xl'
                  }`}
                  title={isRecording ? "Stop Recording" : "Start Recording"}
                >
                  {isRecording ? (
                    <Square className="h-5 w-5 stroke-white stroke-2" />
                  ) : (
                    <Circle className="h-5 w-5 stroke-white stroke-2 fill-none" />
                  )}
                  {isRecording && (
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-400 rounded-full animate-pulse" />
                  )}
                </Button>

                {/* Microphone */}
                <Button
                  variant={isMuted ? "destructive" : "ghost"}
                  size="lg"
                  onClick={handleToggleMute}
                  className={`rounded-full w-14 h-14 transition-all duration-300 ease-out ${
                    isMuted 
                      ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/40 scale-105' 
                      : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 hover:scale-105 shadow-lg hover:shadow-xl'
                  }`}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? (
                    <MicOff className="h-5 w-5 stroke-white stroke-2" />
                  ) : (
                    <Mic className="h-5 w-5 stroke-white stroke-2" />
                  )}
                </Button>

                {/* Camera */}
                <Button
                  variant={!isCameraOn ? "destructive" : "ghost"}
                  size="lg"
                  onClick={handleToggleCamera}
                  className={`rounded-full w-14 h-14 transition-all duration-300 ease-out ${
                    !isCameraOn 
                      ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/40 scale-105' 
                      : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 hover:scale-105 shadow-lg hover:shadow-xl'
                  }`}
                  title={isCameraOn ? "Turn off camera" : "Turn on camera"}
                >
                  {isCameraOn ? (
                    <Video className="h-5 w-5 stroke-white stroke-2" />
                  ) : (
                    <VideoOff className="h-5 w-5 stroke-white stroke-2" />
                  )}
                </Button>

                {/* Screen Share */}
                <Button
                  variant={isScreenSharing ? "default" : "ghost"}
                  size="lg"
                  onClick={handleToggleScreenShare}
                  className={`rounded-full w-14 h-14 relative transition-all duration-300 ease-out ${
                    isScreenSharing 
                      ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/40 scale-105' 
                      : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 hover:scale-105 shadow-lg hover:shadow-xl'
                  }`}
                  title={isScreenSharing ? "Stop sharing" : "Share screen"}
                >
                  <ScreenShare className="h-5 w-5 stroke-white stroke-2" />
                  {isScreenSharing && (
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-400 rounded-full animate-pulse" />
                  )}
                </Button>

                {/* More Options */}
                <Button
                  variant="ghost"
                  size="lg"
                  className="rounded-full w-14 h-14 bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 transition-all duration-300 ease-out hover:scale-105 shadow-lg hover:shadow-xl"
                  title="More options"
                >
                  <MoreHorizontal className="h-5 w-5 stroke-white stroke-2" />
                </Button>
              </div>

              {/* Visual Separator */}
              <div className="h-12 w-px bg-gradient-to-b from-transparent via-gray-500 to-transparent mx-6" />

              {/* Leave Meeting Button */}
              <Button
                variant="destructive"
                size="lg"
                onClick={handleLeaveMeeting}
                className="rounded-full w-14 h-14 bg-red-600 hover:bg-red-700 transition-all duration-300 ease-out hover:scale-105 shadow-lg shadow-red-600/40 hover:shadow-xl hover:shadow-red-600/50"
                title="Leave meeting"
              >
                <PhoneOff className="h-5 w-5 stroke-white stroke-2" />
              </Button>
            </div>

            {/* Refined Control Labels */}
            <div className="flex items-center justify-center mt-4">
              <div className="flex items-center gap-3 mr-8">
                <span className="text-xs text-gray-400 w-[120px] text-center font-medium">Volume Control</span>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-xs text-gray-400 w-14 text-center font-medium">
                  {isRecording ? 'Recording' : 'Record'}
                </span>
                <span className="text-xs text-gray-400 w-14 text-center font-medium">
                  {isMuted ? 'Unmute' : 'Mute'}
                </span>
                <span className="text-xs text-gray-400 w-14 text-center font-medium">
                  {isCameraOn ? 'Video' : 'Video'}
                </span>
                <span className="text-xs text-gray-400 w-14 text-center font-medium">
                  {isScreenSharing ? 'Sharing' : 'Share'}
                </span>
                <span className="text-xs text-gray-400 w-14 text-center font-medium">More</span>
              </div>
              <div className="w-6 mx-6"></div>
              <span className="text-xs text-gray-400 w-14 text-center font-medium">Leave</span>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
          {/* Attendance Form Link */}
          <div className="p-4 bg-blue-50 border-b">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              <ExternalLink className="h-4 w-4 mr-2" />
              Click here - Attendance form
            </Button>
          </div>

          {/* Participants Section */}
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="font-medium flex items-center">
                  <Users className="h-4 w-4 mr-2 text-blue-600" />
                  Participants ({mockParticipants.length})
                </h3>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    <UserCheck className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 px-4">
              <div className="space-y-3 py-4">
                {mockParticipants.map((participant) => (
                  <div key={participant.id} className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={participant.avatar} alt={participant.name} />
                      <AvatarFallback>{participant.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{participant.name}</span>
                        {participant.isHost && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                            Host
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{participant.role}</p>
                    </div>
                    <div className="flex items-center space-x-1">
                      {participant.isMuted ? (
                        <MicOff className="h-3 w-3 text-red-500" />
                      ) : (
                        <Mic className="h-3 w-3 text-green-500" />
                      )}
                      {participant.isCameraOn ? (
                        <Video className="h-3 w-3 text-green-500" />
                      ) : (
                        <VideoOff className="h-3 w-3 text-red-500" />
                      )}
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MessageCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Messages Section */}
          <div className="flex-1 flex flex-col border-t">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="font-medium flex items-center">
                  <MessageCircle className="h-4 w-4 mr-2 text-blue-600" />
                  Messages
                </h3>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 px-4">
              <div className="space-y-4 py-4">
                {chatMessages.map((message) => (
                  <div key={message.id} className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {message.senderName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{message.senderName}</span>
                      <span className="text-xs text-gray-500">{message.timestamp}</span>
                    </div>
                    <p className={`text-sm p-2 rounded-lg max-w-xs ${
                      message.senderName === 'You' 
                        ? 'bg-green-100 text-green-800 ml-auto' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {message.message}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t">
              <div className="flex space-x-2">
                <Input
                  placeholder="Write message here..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1"
                />
                <Button size="sm" onClick={handleSendMessage}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}