package com.sentinel.websocket;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * STOMP-over-WebSocket configuration.
 *
 * Clients connect to:  ws(s)://<host>/ws  (or via SockJS fallback)
 * Subscribe to topics: /topic/alerts          — all new alerts (broadcast)
 *                      /topic/alerts/<siteId> — site-specific alerts
 *
 * The in-memory broker is used — no external broker needed for Render free tier.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Value("${sentinel.cors.allowed-origins:http://localhost:3000,http://localhost:3001}")
    private String allowedOrigins;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Enable simple in-memory broker for /topic/** destinations
        registry.enableSimpleBroker("/topic");
        // Prefix for messages routed to @MessageMapping methods (if needed later)
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(allowedOrigins.split(","))
                .withSockJS();   // SockJS fallback for browsers that don't support native WS
    }
}
